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
	// parentToChild は refresh_token rotation で `親トークン -> 直近の子トークン` を O(1) 参照するための副索引。
	// 旧実装は ConsumeRefreshToken の reuse パスで refreshTokens 全件を走査していたため、
	// 長寿命プロセスで O(N) スキャンがロック競合の原因になっていた。
	parentToChild map[string]string

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
// JSON 化されて /__emulator/snapshot として返ることを前提に snake_case と空配列を保証する。
type Snapshot struct {
	Users         []User         `json:"users"`
	Sessions      []Session      `json:"sessions"`
	RefreshTokens []RefreshToken `json:"refresh_tokens"`
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
		parentToChild: make(map[string]string),
		clock:         cfg.Clock,
		reuseInterval: cfg.ReuseInterval,
	}
}

func (s *Store) CreateUser(email string, passwordHash []byte) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 本物 GoTrue と同じく email は lowercase 正規化して保存する。
	// 旧実装は原文を保存しており、'Alice@example.com' で signup したテストが本物環境で
	// join key 不一致を起こす silent divergence の温床だった。
	normalized := strings.ToLower(email)
	if _, exists := s.emailIndex[normalized]; exists {
		return nil, ErrUserAlreadyExists
	}

	now := s.clock()
	confirmed := now
	id := uuidx.New()
	u := &User{
		ID:               id,
		Email:            normalized,
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
			IdentityData: map[string]any{"email": normalized, "sub": id},
			CreatedAt:    now,
			UpdatedAt:    now,
			LastSignInAt: now,
		}},
		CreatedAt:    now,
		UpdatedAt:    now,
		PasswordHash: passwordHash,
	}
	s.users[id] = u
	s.emailIndex[normalized] = id
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
			delete(s.parentToChild, rt.Parent)
		}
	}
	return nil
}

// SetUserMetadata は signup 時の data フィールド等を Store の元 User に書き込む。
// 既存の map との merge ではなく置換する（GoTrue の raw_user_meta_data 上書き挙動）。
func (s *Store) SetUserMetadata(id string, data map[string]any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return
	}
	// data を独立した map にコピーして共有を断ち切る
	cp := make(map[string]any, len(data))
	for k, v := range data {
		cp[k] = v
	}
	u.UserMetadata = cp
	u.UpdatedAt = s.clock()
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
		// reuse_interval 内なら親→子チェーンの末端（=最新の未失効子）を返す。
		// 子も並行リクエストで rotation されているケース（A→B→C のとき A を再試行）に
		// 対応するため、Parent でチェーンを辿る。
		if s.clock().Sub(rt.IssuedAt) <= s.reuseInterval {
			if leaf := s.findLatestChild(rt.Token); leaf != nil {
				return s.cloneRefreshToken(leaf), s.cloneUser(u), nil
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
	s.parentToChild[rt.Token] = newRT.Token
	return s.cloneRefreshToken(newRT), s.cloneUser(u), nil
}

// findLatestChild は parentToChild 副索引で親→子チェーンを O(チェーン長) で辿り、
// Revoked=false の末端を返す。旧実装は refreshTokens 全件走査で O(N) だった。
// 呼び出し側で write lock を保持していること。
func (s *Store) findLatestChild(parent string) *RefreshToken {
	visited := map[string]bool{parent: true}
	current := parent
	for {
		childToken, ok := s.parentToChild[current]
		if !ok || visited[childToken] {
			return nil
		}
		visited[childToken] = true
		child, ok := s.refreshTokens[childToken]
		if !ok {
			return nil
		}
		if !child.Revoked {
			return child
		}
		current = childToken
	}
}

// RevokeRefreshTokensBySession は logout で呼ばれる。指定sessionの全refresh tokenを失効。
// reuse_interval 内の reuse パスもブロックしたいので IssuedAt を reuse_interval+1 だけ過去に遡らせる。
// 旧実装は -1h 固定だったため、運用で reuse_interval を 2h などに設定したときに logout が無効化されない不具合があった。
func (s *Store) RevokeRefreshTokensBySession(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	past := s.clock().Add(-(s.reuseInterval + time.Second))
	for _, rt := range s.refreshTokens {
		if rt.SessionID == sessionID {
			rt.Revoked = true
			rt.IssuedAt = past
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
	s.parentToChild = make(map[string]string)
}

func (s *Store) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	// nil スライスが JSON で null になるのを避けるため空スライスで初期化する
	snap := Snapshot{
		Users:         []User{},
		Sessions:      []Session{},
		RefreshTokens: []RefreshToken{},
	}
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

// cloneUser は呼び出し側の map/スライス変更がストアの実体に漏れないよう deep copy する。
// 旧実装はシャローコピーで、呼び出し側で `u.AppMetadata["k"]=v` をすると RWMutex の外から
// ストアの map に書き込みが入り、Snapshot 中の goroutine と並走して concurrent map fatal を
// 引き起こすリスクがあった。
func (s *Store) cloneUser(u *User) *User {
	c := *u
	c.AppMetadata = cloneAnyMap(u.AppMetadata)
	c.UserMetadata = cloneAnyMap(u.UserMetadata)
	if u.Identities != nil {
		c.Identities = make([]Identity, len(u.Identities))
		for i, id := range u.Identities {
			ic := id
			ic.IdentityData = cloneAnyMap(id.IdentityData)
			c.Identities[i] = ic
		}
	}
	if u.PasswordHash != nil {
		c.PasswordHash = append([]byte(nil), u.PasswordHash...)
	}
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

func cloneAnyMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	cp := make(map[string]any, len(m))
	for k, v := range m {
		cp[k] = v
	}
	return cp
}
