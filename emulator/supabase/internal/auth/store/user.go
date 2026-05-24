package store

import (
	"strings"

	"github.com/google/uuid"
)

func (s *Store) CreateUser(email string, passwordHash []byte) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 本物 GoTrue と同じく email は lowercase 正規化する。
	// 旧実装は原文保存していて、'Alice@example.com' が本物環境で join key 不一致を起こしていた。
	normalized := strings.ToLower(email)
	if _, exists := s.emailIndex[normalized]; exists {
		return nil, ErrUserAlreadyExists
	}

	now := s.clock()
	confirmed := now
	id := uuid.NewString()
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

// SetUserMetadata は GoTrue の raw_user_meta_data 上書き挙動と同じく置換する（merge ではない）。
func (s *Store) SetUserMetadata(id string, data map[string]any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return
	}
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
