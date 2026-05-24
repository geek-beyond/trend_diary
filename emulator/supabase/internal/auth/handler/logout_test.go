package handler_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler/handlertest"
)

func TestLogout(t *testing.T) {
	t.Run("冪等（GoTrue 互換で常に204）", func(t *testing.T) {
		cases := []struct {
			name      string
			setHeader func(r *http.Request)
		}{
			{name: "Authorization 無し", setHeader: func(*http.Request) {}},
			{name: "不正な Bearer", setHeader: func(r *http.Request) { r.Header.Set("Authorization", "Bearer bogus") }},
		}
		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				st := handlertest.NewStore(nil)
				h := handler.NewLogout(st, handlertest.NewTokens(st, nil))

				req := handlertest.NewRequest(t, http.MethodPost, "/auth/v1/logout", nil)
				c.setHeader(req)
				rec := httptest.NewRecorder()
				h.ServeHTTP(rec, req)
				if rec.Code != http.StatusNoContent {
					t.Fatalf("status: %d", rec.Code)
				}
			})
		}
	})

	t.Run("有効な Bearer で 204 + refresh_token 失効", func(t *testing.T) {
		st := handlertest.NewStore(nil)
		tk := handlertest.NewTokens(st, nil)
		seeded := handlertest.Seed(t, st, tk, "alice@example.com", "password123")
		logout := handler.NewLogout(st, tk)
		tokenH := handler.NewToken(st, tk)

		req := handlertest.NewRequest(t, http.MethodPost, "/auth/v1/logout", nil)
		req.Header.Set("Authorization", "Bearer "+seeded.AccessToken)
		rec := httptest.NewRecorder()
		logout.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("logout status: %d", rec.Code)
		}

		refresh := httptest.NewRecorder()
		tokenH.ServeHTTP(refresh, handlertest.NewRequest(t, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": seeded.RefreshToken,
		}))
		if refresh.Code != http.StatusBadRequest {
			t.Errorf("refresh after logout status: %d", refresh.Code)
		}
	})

	t.Run("期限切れ access_token でも refresh_token は revoke される", func(t *testing.T) {
		// 旧実装は Tokens.Verify が exp で失敗 → revoke 走らず、logout 後も refresh が通った。
		current := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		clock := func() time.Time { return current }
		st := handlertest.NewStore(clock)
		tk := handlertest.NewTokens(st, clock)
		seeded := handlertest.Seed(t, st, tk, "alice@example.com", "password123")
		logout := handler.NewLogout(st, tk)
		tokenH := handler.NewToken(st, tk)

		// access_token を期限切れにする
		current = current.Add(2 * time.Hour)

		req := handlertest.NewRequest(t, http.MethodPost, "/auth/v1/logout", nil)
		req.Header.Set("Authorization", "Bearer "+seeded.AccessToken)
		rec := httptest.NewRecorder()
		logout.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("logout status: %d", rec.Code)
		}

		refresh := httptest.NewRecorder()
		tokenH.ServeHTTP(refresh, handlertest.NewRequest(t, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": seeded.RefreshToken,
		}))
		if refresh.Code != http.StatusBadRequest {
			t.Errorf("expired-logout 後の refresh は失敗するべき: %d", refresh.Code)
		}
	})
}
