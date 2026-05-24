package handler_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler/handlertest"
)

func TestGetUser(t *testing.T) {
	t.Run("正常系", func(t *testing.T) {
		t.Run("有効なBearerでuserを返す", func(t *testing.T) {
			st := handlertest.NewStore(nil)
			tk := handlertest.NewTokens(st, nil)
			seeded := handlertest.Seed(t, st, tk, "alice@example.com", "password123")
			h := handler.NewGetUser(st, tk)

			req := handlertest.NewRequest(t, http.MethodGet, "/auth/v1/user", nil)
			req.Header.Set("Authorization", "Bearer "+seeded.AccessToken)
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("status: %d", rec.Code)
			}
		})
	})

	t.Run("認証失敗", func(t *testing.T) {
		// 共通して 401 + X-Supabase-Api-Version + error_code='session_not_found' を返す。
		cases := []struct {
			name      string
			setHeader func(r *http.Request)
		}{
			{name: "Authorization 欠落", setHeader: func(*http.Request) {}},
			{name: "不正な署名の Bearer", setHeader: func(r *http.Request) { r.Header.Set("Authorization", "Bearer not-a-jwt") }},
		}
		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				st := handlertest.NewStore(nil)
				h := handler.NewGetUser(st, handlertest.NewTokens(st, nil))

				req := handlertest.NewRequest(t, http.MethodGet, "/auth/v1/user", nil)
				c.setHeader(req)
				rec := httptest.NewRecorder()
				h.ServeHTTP(rec, req)

				if rec.Code != http.StatusUnauthorized {
					t.Fatalf("status: %d", rec.Code)
				}
				if rec.Header().Get("X-Supabase-Api-Version") == "" {
					t.Error("X-Supabase-Api-Version header missing")
				}
				body := rec.Body.String()
				if !strings.Contains(body, `"session_not_found"`) {
					t.Errorf("error_code missing: %s", body)
				}
				if !strings.Contains(body, "Auth session missing") {
					t.Errorf("msg missing: %s", body)
				}
			})
		}
	})

	t.Run("注入clockを進めて期限切れJWTで401", func(t *testing.T) {
		current := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		clock := func() time.Time { return current }
		st := handlertest.NewStore(clock)
		tk := handlertest.NewTokens(st, clock)
		seeded := handlertest.Seed(t, st, tk, "alice@example.com", "password123")
		h := handler.NewGetUser(st, tk)

		current = current.Add(2 * time.Hour)
		req := handlertest.NewRequest(t, http.MethodGet, "/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+seeded.AccessToken)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status: %d", rec.Code)
		}
	})
}
