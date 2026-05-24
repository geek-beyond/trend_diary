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

	t.Run("OAuthError は token 系の {\"error\",\"error_description\"} を返し X-Supabase-Api-Version も付与する", func(t *testing.T) {
		rec := httptest.NewRecorder()
		httpx.NewResponder(rec).OAuthError(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")

		if rec.Header().Get("X-Supabase-Api-Version") == "" {
			t.Error("X-Supabase-Api-Version header missing")
		}
		var body httpx.OAuthError
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if body.Error != "invalid_grant" || !strings.Contains(body.ErrorDescription, "Invalid login credentials") {
			t.Errorf("body: %+v", body)
		}
	})
}

func TestResponder_WriteOnce(t *testing.T) {
	t.Run("JSON を 2 回呼んでも 2 回目は no-op で body は連結されない", func(t *testing.T) {
		rec := httptest.NewRecorder()
		r := httpx.NewResponder(rec)
		r.JSON(http.StatusOK, map[string]string{"first": "ok"})
		r.JSON(http.StatusBadRequest, map[string]string{"second": "ng"})

		if rec.Code != http.StatusOK {
			t.Errorf("status must stay at first call: %d", rec.Code)
		}
		// JSON エンコードで改行が入るが、それも含めて 1 オブジェクトのみ
		if got := strings.Count(rec.Body.String(), `"first"`); got != 1 {
			t.Errorf("first body must appear once: %s", rec.Body.String())
		}
		if strings.Contains(rec.Body.String(), `"second"`) {
			t.Errorf("second body must not be written: %s", rec.Body.String())
		}
	})

	t.Run("APIError → JSON の連鎖でも 2 回目は no-op", func(t *testing.T) {
		rec := httptest.NewRecorder()
		r := httpx.NewResponder(rec)
		r.APIError(http.StatusBadRequest, "first error")
		r.JSON(http.StatusOK, map[string]string{"second": "should-not-appear"})

		if rec.Code != http.StatusBadRequest {
			t.Errorf("status: %d", rec.Code)
		}
		if strings.Contains(rec.Body.String(), "should-not-appear") {
			t.Errorf("body: %s", rec.Body.String())
		}
	})
}

func TestResponder_NoContentStripsBodyHeaders(t *testing.T) {
	t.Run("NoContent は Content-Type / Content-Length を削る（RFC 7230 §3.3.2）", func(t *testing.T) {
		rec := httptest.NewRecorder()
		r := httpx.NewResponder(rec)
		r.Header().Set("Content-Type", "application/json")
		r.Header().Set("Content-Length", "42")
		r.NoContent()

		if rec.Code != http.StatusNoContent {
			t.Fatalf("status: %d", rec.Code)
		}
		if got := rec.Header().Get("Content-Type"); got != "" {
			t.Errorf("Content-Type must be cleared: %s", got)
		}
		if got := rec.Header().Get("Content-Length"); got != "" {
			t.Errorf("Content-Length must be cleared: %s", got)
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

	t.Run("handler が panic しても recover して 500 + JSON を返す", func(t *testing.T) {
		panicking := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			panic("boom")
		})
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		httpx.WithResponder(panicking).ServeHTTP(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("status: %d", rec.Code)
		}
		if rec.Header().Get("X-Supabase-Api-Version") == "" {
			t.Error("X-Supabase-Api-Version header missing on recover path")
		}
		if !strings.Contains(rec.Body.String(), `"unexpected_failure"`) {
			t.Errorf("recover body must carry error_code: %s", rec.Body.String())
		}
	})
}
