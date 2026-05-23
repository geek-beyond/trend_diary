package auth

import (
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/uuidx"
)

// Store はインメモリで User/Session/RefreshToken を管理する。
// 全メソッドは goroutine-safe（RWMutex でガード）。
type Store struct {
	mu sync.RWMutex

	users         map[string]*User         // ID -> User
	emailIndex    map[string]string        // lower(email) -> userID
	sessions      map[string]*Session      // SessionID -> Session
	refreshTokens map[string]*RefreshToken // Token -> RefreshToken

	clock         func() time.Time
	reuseInterval time.Duration
}

// StoreConfig は Store の依存を注入する。
type StoreConfig struct {
	Clock         func() time.Time
	ReuseInterval time.Duration
}

var (
	ErrUserAlreadyExists   = errors.New("auth: user already exists")
	ErrUserNotFound        = errors.New("auth: user not found")
	ErrInvalidRefreshToken = errors.New("auth: invalid refresh token")
)

// Snapshot はテスト/デバッグ用にStoreの全データをコピーして返す。
type Snapshot struct {
	Users         []User
	Sessions      []Session
	RefreshTokens []RefreshToken
}

func NewStore(cfg StoreConfig) *Store {
	if cfg.Clock == nil {
		cfg.Clock = time.Now
	}
	if cfg.ReuseInterval == 0 {
		cfg.ReuseInterval = 10 * time.Second
	}
	return &Store{
		users:         make(map[string]*User),
		emailIndex:    make(map[string]string),
		sessions:      make(map[string]*Session),
		refreshTokens: make(map[string]*RefreshToken),
		clock:         cfg.Clock,
		reuseInterval: cfg.ReuseInterval,
	}
}

func (s *Store) CreateUser(email string, passwordHash []byte) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := strings.ToLower(email)
	if _, exists := s.emailIndex[key]; exists {
		return nil, ErrUserAlreadyExists
	}

	now := s.clock()
	confirmed := now
	id := uuidx.New()
	u := &User{
		ID:               id,
		Email:            email,
		Aud:              "authenticated",
		Role:             "authenticated",
		EmailConfirmedAt: &confirmed,
		ConfirmedAt:      &confirmed,
		AppMetadata:      map[string]any{"provider": "email", "providers": []string{"email"}},
		UserMetadata:     map[string]any{},
		Identities: []Identity{{
			ID:           id,
			UserID:       id,
			Provider:     "email",
			IdentityData: map[string]any{"email": email, "sub": id},
			CreatedAt:    now,
			UpdatedAt:    now,
			LastSignInAt: now,
		}},
		CreatedAt:    now,
		UpdatedAt:    now,
		PasswordHash: passwordHash,
	}
	s.users[id] = u
	s.emailIndex[key] = id
	return s.cloneUser(u), nil
}

func (s *Store) FindUserByEmail(email string) (*User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.emailIndex[strings.ToLower(email)]
	if !ok {
		return nil, false
	}
	u, ok := s.users[id]
	if !ok {
		return nil, false
	}
	return s.cloneUser(u), true
}

func (s *Store) FindUserByID(id string) (*User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	if !ok {
		return nil, false
	}
	return s.cloneUser(u), true
}

func (s *Store) DeleteUser(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return ErrUserNotFound
	}
	delete(s.users, id)
	delete(s.emailIndex, strings.ToLower(u.Email))
	for sid, sess := range s.sessions {
		if sess.UserID == id {
			delete(s.sessions, sid)
		}
	}
	for tok, rt := range s.refreshTokens {
		if rt.UserID == id {
			delete(s.refreshTokens, tok)
		}
	}
	return nil
}

func (s *Store) UpdateLastSignIn(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return
	}
	now := s.clock()
	u.LastSignInAt = &now
	u.UpdatedAt = now
}

func (s *Store) CreateSession(userID string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[userID]; !ok {
		return nil, ErrUserNotFound
	}
	sess := &Session{
		ID:        uuidx.New(),
		UserID:    userID,
		CreatedAt: s.clock(),
	}
	s.sessions[sess.ID] = sess
	return s.cloneSession(sess), nil
}

func (s *Store) IssueRefreshToken(userID, sessionID string) (*RefreshToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[userID]; !ok {
		return nil, ErrUserNotFound
	}
	rt := &RefreshToken{
		Token:     uuidx.New() + uuidx.New(),
		UserID:    userID,
		SessionID: sessionID,
		IssuedAt:  s.clock(),
	}
	s.refreshTokens[rt.Token] = rt
	return s.cloneRefreshToken(rt), nil
}

// ConsumeRefreshToken は rotation を行う。
//   - 未失効 token: 新token発行、旧tokenは Revoked=true + IssuedAt=now でreuse_interval計測の起点を更新
//   - Revoked された token: IssuedAt から reuse_interval 内なら同じ新tokenを返す（リトライ耐性）
//   - reuse_interval を超えた token: ErrInvalidRefreshToken
func (s *Store) ConsumeRefreshToken(token string) (*RefreshToken, *User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rt, ok := s.refreshTokens[token]
	if !ok {
		return nil, nil, ErrInvalidRefreshToken
	}
	u, ok := s.users[rt.UserID]
	if !ok {
		return nil, nil, ErrInvalidRefreshToken
	}

	if rt.Revoked {
		// reuse_interval 内なら同一の子tokenを返す
		if s.clock().Sub(rt.IssuedAt) <= s.reuseInterval {
			// 子tokenを探す
			for _, child := range s.refreshTokens {
				if child.Parent == rt.Token && !child.Revoked {
					return s.cloneRefreshToken(child), s.cloneUser(u), nil
				}
			}
		}
		return nil, nil, ErrInvalidRefreshToken
	}

	now := s.clock()
	rt.Revoked = true
	rt.IssuedAt = now // reuse_interval 計測の起点

	newRT := &RefreshToken{
		Token:     uuidx.New() + uuidx.New(),
		UserID:    rt.UserID,
		SessionID: rt.SessionID,
		IssuedAt:  now,
		Parent:    rt.Token,
	}
	s.refreshTokens[newRT.Token] = newRT
	return s.cloneRefreshToken(newRT), s.cloneUser(u), nil
}

// RevokeRefreshTokensBySession は logout で呼ばれる。指定sessionの全refresh tokenを失効。
func (s *Store) RevokeRefreshTokensBySession(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, rt := range s.refreshTokens {
		if rt.SessionID == sessionID {
			rt.Revoked = true
			// 再利用も不可にするため IssuedAt を 1 時間前に遡らせる
			rt.IssuedAt = s.clock().Add(-time.Hour)
		}
	}
	delete(s.sessions, sessionID)
}

func (s *Store) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users = make(map[string]*User)
	s.emailIndex = make(map[string]string)
	s.sessions = make(map[string]*Session)
	s.refreshTokens = make(map[string]*RefreshToken)
}

func (s *Store) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snap := Snapshot{}
	for _, u := range s.users {
		snap.Users = append(snap.Users, *s.cloneUser(u))
	}
	for _, sess := range s.sessions {
		snap.Sessions = append(snap.Sessions, *s.cloneSession(sess))
	}
	for _, rt := range s.refreshTokens {
		snap.RefreshTokens = append(snap.RefreshTokens, *s.cloneRefreshToken(rt))
	}
	return snap
}

func (s *Store) cloneUser(u *User) *User {
	c := *u
	// マップは浅いコピーで十分（呼び出し側で書き換える想定がない）
	return &c
}

func (s *Store) cloneSession(sess *Session) *Session {
	c := *sess
	return &c
}

func (s *Store) cloneRefreshToken(rt *RefreshToken) *RefreshToken {
	c := *rt
	return &c
}
