package httpx_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

func TestResponder(t *testing.T) {
	t.Run("JSON", func(t *testing.T) {
		t.Run("Content-Type/status/body を書き出す", func(t *testing.T) {
			rec := httptest.NewRecorder()
			httpx.NewResponder(rec).JSON(http.StatusCreated, map[string]string{"hello": "world"})

			if rec.Code != http.StatusCreated {
				t.Errorf("status: %d", rec.Code)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type: %s", got)
			}
			if !strings.Contains(rec.Body.String(), `"hello":"world"`) {
				t.Errorf("body: %s", rec.Body.String())
			}
		})

		t.Run("body=nil で本文を書かない", func(t *testing.T) {
			rec := httptest.NewRecorder()
			httpx.NewResponder(rec).JSON(http.StatusNoContent, nil)
			if rec.Body.Len() != 0 {
				t.Errorf("body should be empty: %q", rec.Body.String())
			}
		})
	})

	t.Run("APIError", func(t *testing.T) {
		t.Run("code は string 化して X-Supabase-Api-Version も付与する", func(t *testing.T) {
			rec := httptest.NewRecorder()
			httpx.NewResponder(rec).APIError(http.StatusUnprocessableEntity, "User already registered")

			if rec.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status: %d", rec.Code)
			}
			if rec.Header().Get("X-Supabase-Api-Version") == "" {
				t.Error("X-Supabase-Api-Version header missing")
			}
			var body httpx.APIError
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if body.Code != "422" {
				t.Errorf("Code: %s (must be string)", body.Code)
			}
			if !strings.Contains(body.Msg, "already registered") {
				t.Errorf("Msg: %s", body.Msg)
			}
		})

		t.Run("WithCode は error_code を埋め込む", func(t *testing.T) {
			rec := httptest.NewRecorder()
			httpx.NewResponder(rec).APIErrorWithCode(http.StatusUnauthorized, "session_not_found", "Auth session missing!")

			var body httpx.APIError
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if body.ErrorCode != "session_not_found" {
				t.Errorf("ErrorCode: %s", body.ErrorCode)
			}
		})
	})

	t.Run("OAuthError は token 系の {\"error\",\"error_description\"} を返す", func(t *testing.T) {
		rec := httptest.NewRecorder()
		httpx.NewResponder(rec).OAuthError(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")

		var body httpx.OAuthError
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if body.Error != "invalid_grant" || !strings.Contains(body.ErrorDescription, "Invalid login credentials") {
			t.Errorf("body: %+v", body)
		}
	})
}

func TestWithResponder(t *testing.T) {
	t.Run("middleware が context に Responder を注入し、後段 handler から MustFromContext で取り出せる", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			httpx.MustFromContext(r.Context()).JSON(http.StatusOK, map[string]string{"ok": "yes"})
		})

		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		httpx.WithResponder(next).ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status: %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), `"ok":"yes"`) {
			t.Errorf("body: %s", rec.Body.String())
		}
	})

	t.Run("middleware を経由せず MustFromContext を呼ぶと panic する", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected panic")
			}
		}()
		httpx.MustFromContext(context.Background())
	})
}
