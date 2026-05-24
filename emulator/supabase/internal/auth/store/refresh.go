package store

import (
	"time"

	"github.com/google/uuid"
)

func (s *Store) CreateSession(userID string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.createSessionLocked(userID)
}

func (s *Store) IssueRefreshToken(userID, sessionID string) (*RefreshToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.issueRefreshTokenLocked(userID, sessionID)
}

// IssueSession は session と refresh_token を 1 ロックで原子的に発行する。
// CreateSession + IssueRefreshToken を別ロックで呼ぶと、その隙に DeleteUser が走った場合に
// session だけ残って refresh_token 発行が失敗するため、handler から使うときはこちらを使う。
func (s *Store) IssueSession(userID string) (*Session, *RefreshToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, err := s.createSessionLocked(userID)
	if err != nil {
		return nil, nil, err
	}
	rt, err := s.issueRefreshTokenLocked(userID, sess.ID)
	if err != nil {
		// session 単独で残らないよう巻き戻す
		delete(s.sessions, sess.ID)
		return nil, nil, err
	}
	return sess, rt, nil
}

func (s *Store) createSessionLocked(userID string) (*Session, error) {
	if _, ok := s.users[userID]; !ok {
		return nil, ErrUserNotFound
	}
	sess := &Session{
		ID:        uuid.NewString(),
		UserID:    userID,
		CreatedAt: s.clock(),
	}
	s.sessions[sess.ID] = sess
	return s.cloneSession(sess), nil
}

func (s *Store) issueRefreshTokenLocked(userID, sessionID string) (*RefreshToken, error) {
	if _, ok := s.users[userID]; !ok {
		return nil, ErrUserNotFound
	}
	rt := &RefreshToken{
		// 64 hex 文字相当の token を生成（GoTrue のデフォルト refresh_token と同等の長さ）
		Token:     uuid.NewString() + uuid.NewString(),
		UserID:    userID,
		SessionID: sessionID,
		IssuedAt:  s.clock(),
	}
	s.refreshTokens[rt.Token] = rt
	return s.cloneRefreshToken(rt), nil
}

// ConsumeRefreshToken は rotation を行う:
//   - 未失効 token: 新 token を発行、旧 token は Revoked=true + IssuedAt=now で reuse_interval 起点を更新
//   - Revoked token: reuse_interval 内なら親→子チェーンの未失効末端を返す（ロスト応答リトライ耐性）
//   - reuse_interval 超過: ErrInvalidRefreshToken
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
		// 子も並行 rotation で revoke されているケース（A→B→C のとき A を再試行）に
		// 対応するため Parent チェーンを末端まで辿る。
		if s.clock().Sub(rt.IssuedAt) <= s.reuseInterval {
			if leaf := s.findLatestChild(rt.Token); leaf != nil {
				return s.cloneRefreshToken(leaf), s.cloneUser(u), nil
			}
		}
		return nil, nil, ErrInvalidRefreshToken
	}

	now := s.clock()
	rt.Revoked = true
	rt.IssuedAt = now

	newRT := &RefreshToken{
		Token:     uuid.NewString() + uuid.NewString(),
		UserID:    rt.UserID,
		SessionID: rt.SessionID,
		IssuedAt:  now,
		Parent:    rt.Token,
	}
	s.refreshTokens[newRT.Token] = newRT
	s.parentToChild[rt.Token] = newRT.Token
	return s.cloneRefreshToken(newRT), s.cloneUser(u), nil
}

// findLatestChild は parentToChild 副索引でチェーンを O(チェーン長) で辿る。write lock 保持前提。
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

// RevokeRefreshTokensBySession は logout 用。reuse_interval 内 reuse もブロックしたいので
// IssuedAt を reuse_interval+1s 過去に遡らせる。
// 旧実装は -1h 固定で reuse_interval>1h のとき logout 無効化される不具合があった。
func (s *Store) RevokeRefreshTokensBySession(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	past := s.clock().Add(-(s.reuseInterval + time.Second))
	for tok, rt := range s.refreshTokens {
		if rt.SessionID == sessionID {
			rt.Revoked = true
			rt.IssuedAt = past
			// parentToChild に残ると findLatestChild が無駄に辿ってしまうので両端を掃除する。
			if rt.Parent != "" {
				delete(s.parentToChild, rt.Parent)
			}
			delete(s.parentToChild, tok)
		}
	}
	delete(s.sessions, sessionID)
}
