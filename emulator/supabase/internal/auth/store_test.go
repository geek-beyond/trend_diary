package auth

import (
	"errors"
	"sync"
	"testing"
	"time"
)

func newStore() *Store {
	return NewStore(StoreConfig{
		Clock:         func() time.Time { return time.Date(2026, 5, 23, 0, 0, 0, 0, time.UTC) },
		ReuseInterval: 10 * time.Second,
	})
}

func TestStore_CreateUser(t *testing.T) {
	t.Run("新規ユーザーがIDとともに登録される", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		u, err := s.CreateUser("alice@example.com", hash)
		if err != nil {
			t.Fatalf("CreateUser: %v", err)
		}
		if u.ID == "" {
			t.Fatal("user ID is empty")
		}
		if u.Email != "alice@example.com" {
			t.Errorf("email mismatch: %s", u.Email)
		}
		if u.Aud != "authenticated" || u.Role != "authenticated" {
			t.Errorf("aud/role mismatch: aud=%s role=%s", u.Aud, u.Role)
		}
	})

	t.Run("同じemailで2回作るとErrUserAlreadyExists", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		_, _ = s.CreateUser("alice@example.com", hash)
		_, err := s.CreateUser("alice@example.com", hash)
		if !errors.Is(err, ErrUserAlreadyExists) {
			t.Fatalf("expected ErrUserAlreadyExists, got %v", err)
		}
	})

	t.Run("emailの大文字小文字を無視して重複検知する", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		_, _ = s.CreateUser("alice@example.com", hash)
		_, err := s.CreateUser("ALICE@example.com", hash)
		if !errors.Is(err, ErrUserAlreadyExists) {
			t.Fatalf("expected ErrUserAlreadyExists, got %v", err)
		}
	})
}

func TestStore_FindUserByEmail(t *testing.T) {
	t.Run("大文字小文字を無視してヒットする", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		created, _ := s.CreateUser("alice@example.com", hash)
		got, ok := s.FindUserByEmail("ALICE@EXAMPLE.COM")
		if !ok {
			t.Fatal("not found")
		}
		if got.ID != created.ID {
			t.Errorf("ID mismatch")
		}
	})

	t.Run("存在しないemailはfalseを返す", func(t *testing.T) {
		s := newStore()
		_, ok := s.FindUserByEmail("nobody@example.com")
		if ok {
			t.Fatal("should not be found")
		}
	})
}

func TestStore_DeleteUser(t *testing.T) {
	t.Run("ユーザー削除で関連refresh_tokenとsessionも消える", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		sess, _ := s.CreateSession(u.ID)
		tok, _ := s.IssueRefreshToken(u.ID, sess.ID)

		if err := s.DeleteUser(u.ID); err != nil {
			t.Fatalf("DeleteUser: %v", err)
		}
		if _, ok := s.FindUserByID(u.ID); ok {
			t.Error("user still exists")
		}
		if _, _, err := s.ConsumeRefreshToken(tok.Token); err == nil {
			t.Error("refresh token still usable after user delete")
		}
	})

	t.Run("存在しないIDの削除はErrUserNotFound", func(t *testing.T) {
		s := newStore()
		err := s.DeleteUser("nonexistent")
		if !errors.Is(err, ErrUserNotFound) {
			t.Fatalf("expected ErrUserNotFound, got %v", err)
		}
	})
}

func TestStore_RefreshTokenRotation(t *testing.T) {
	t.Run("IssueRefreshTokenがユニークなtokenを返す", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		sess, _ := s.CreateSession(u.ID)
		t1, _ := s.IssueRefreshToken(u.ID, sess.ID)
		t2, _ := s.IssueRefreshToken(u.ID, sess.ID)
		if t1.Token == t2.Token {
			t.Fatal("tokens collide")
		}
	})

	t.Run("ConsumeRefreshTokenが新tokenを返し旧tokenを失効させる", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		sess, _ := s.CreateSession(u.ID)
		old, _ := s.IssueRefreshToken(u.ID, sess.ID)

		newTok, gotUser, err := s.ConsumeRefreshToken(old.Token)
		if err != nil {
			t.Fatalf("ConsumeRefreshToken: %v", err)
		}
		if newTok.Token == old.Token {
			t.Fatal("token not rotated")
		}
		if gotUser.ID != u.ID {
			t.Errorf("user ID mismatch")
		}
	})

	t.Run("reuse_interval内なら旧tokenが再度使える", func(t *testing.T) {
		// Clock を制御して reuse_interval (10s) 内であることを保証
		now := time.Date(2026, 5, 23, 0, 0, 0, 0, time.UTC)
		s := NewStore(StoreConfig{
			Clock:         func() time.Time { return now },
			ReuseInterval: 10 * time.Second,
		})
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		sess, _ := s.CreateSession(u.ID)
		old, _ := s.IssueRefreshToken(u.ID, sess.ID)

		_, _, err := s.ConsumeRefreshToken(old.Token)
		if err != nil {
			t.Fatalf("first consume: %v", err)
		}
		// reuse_interval 内の再利用
		_, _, err = s.ConsumeRefreshToken(old.Token)
		if err != nil {
			t.Fatalf("reuse within interval should succeed: %v", err)
		}
	})

	t.Run("reuse_interval超過後の旧tokenはErrInvalidRefreshToken", func(t *testing.T) {
		now := time.Date(2026, 5, 23, 0, 0, 0, 0, time.UTC)
		s := NewStore(StoreConfig{
			Clock:         func() time.Time { return now },
			ReuseInterval: 10 * time.Second,
		})
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		sess, _ := s.CreateSession(u.ID)
		old, _ := s.IssueRefreshToken(u.ID, sess.ID)

		_, _, _ = s.ConsumeRefreshToken(old.Token)
		// 11秒進める
		now = now.Add(11 * time.Second)
		_, _, err := s.ConsumeRefreshToken(old.Token)
		if !errors.Is(err, ErrInvalidRefreshToken) {
			t.Fatalf("expected ErrInvalidRefreshToken, got %v", err)
		}
	})

	t.Run("RevokeRefreshTokensBySession後はrefresh不可", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		sess, _ := s.CreateSession(u.ID)
		tok, _ := s.IssueRefreshToken(u.ID, sess.ID)

		s.RevokeRefreshTokensBySession(sess.ID)
		_, _, err := s.ConsumeRefreshToken(tok.Token)
		if !errors.Is(err, ErrInvalidRefreshToken) {
			t.Fatalf("expected ErrInvalidRefreshToken, got %v", err)
		}
	})
}

func TestStore_Reset(t *testing.T) {
	t.Run("Resetで全データが消える", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		sess, _ := s.CreateSession(u.ID)
		_, _ = s.IssueRefreshToken(u.ID, sess.ID)

		s.Reset()

		if _, ok := s.FindUserByID(u.ID); ok {
			t.Error("user remains")
		}
		snap := s.Snapshot()
		if len(snap.Users) != 0 || len(snap.RefreshTokens) != 0 || len(snap.Sessions) != 0 {
			t.Errorf("snapshot not empty: %+v", snap)
		}
	})
}

func TestStore_Race(t *testing.T) {
	t.Run("並行書き込みでデータ競合しない", func(t *testing.T) {
		s := newStore()
		hash, _ := HashPassword("password123")
		var wg sync.WaitGroup
		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				email := "u" + itoa(i) + "@example.com"
				u, err := s.CreateUser(email, hash)
				if err != nil {
					t.Errorf("CreateUser: %v", err)
					return
				}
				sess, _ := s.CreateSession(u.ID)
				_, _ = s.IssueRefreshToken(u.ID, sess.ID)
			}(i)
		}
		wg.Wait()
		snap := s.Snapshot()
		if len(snap.Users) != 50 {
			t.Errorf("user count: got=%d want=50", len(snap.Users))
		}
	})
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	var b [10]byte
	pos := len(b)
	for i > 0 {
		pos--
		b[pos] = byte('0' + i%10)
		i /= 10
	}
	return string(b[pos:])
}
