package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/config"
)

func newTestHandler(t *testing.T) (*Handler, *httptest.Server) {
	t.Helper()
	st := store.New(store.Config{})
	h := New(Config{
		JWTSecret:      config.DefaultJWTSecret,
		JWTIssuer:      "http://127.0.0.1:54321/auth/v1",
		AccessTokenTTL: time.Hour,
		AnonKey:        config.DefaultAnonKey,
		ServiceRoleKey: config.DefaultServiceRoleKey,
	}, st)
	mux := http.NewServeMux()
	h.Mount(mux)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return h, srv
}

func newHandlerWithClock(t *testing.T, clock func() time.Time) (*Handler, *httptest.Server) {
	t.Helper()
	st := store.New(store.Config{Clock: clock})
	h := New(Config{
		JWTSecret:      config.DefaultJWTSecret,
		JWTIssuer:      "http://127.0.0.1:54321/auth/v1",
		AccessTokenTTL: time.Hour,
		AnonKey:        config.DefaultAnonKey,
		ServiceRoleKey: config.DefaultServiceRoleKey,
		Clock:          clock,
	}, st)
	mux := http.NewServeMux()
	h.Mount(mux)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return h, srv
}

func doJSON(t *testing.T, srv *httptest.Server, method, path string, body any) *http.Response {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, srv.URL+path, rdr)
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := srv.Client().Do(req)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	return resp
}

func decodeBody(t *testing.T, resp *http.Response, dst any) {
	t.Helper()
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(dst); err != nil {
		t.Fatalf("decode: %v", err)
	}
}

func TestSignup(t *testing.T) {
	t.Run("正しいemail/passwordで200とtokenResponseを返す", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var tr tokenResponse
		decodeBody(t, resp, &tr)
		if tr.AccessToken == "" || tr.RefreshToken == "" {
			t.Fatal("missing tokens")
		}
		if tr.User == nil || tr.User.Email != "alice@example.com" {
			t.Errorf("user: %+v", tr.User)
		}
	})

	t.Run("既存emailで422 + 'already registered' を含む", func(t *testing.T) {
		_, srv := newTestHandler(t)
		body := map[string]string{"email": "alice@example.com", "password": "password123"}
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", body).Body.Close()
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", body)
		if resp.StatusCode != http.StatusUnprocessableEntity {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var e apiError
		decodeBody(t, resp, &e)
		if !strings.Contains(e.Msg, "already registered") {
			t.Errorf("msg must contain 'already registered': %s", e.Msg)
		}
	})

	t.Run("dataが永続化される", func(t *testing.T) {
		_, srv := newTestHandler(t)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]any{
			"email": "alice@example.com", "password": "password123",
			"data": map[string]any{"nickname": "alice"},
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)
		if got := tr.User.UserMetadata["nickname"]; got != "alice" {
			t.Fatalf("signup response nickname: %v", got)
		}

		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		resp, _ := srv.Client().Do(req)
		var u store.User
		decodeBody(t, resp, &u)
		if got := u.UserMetadata["nickname"]; got != "alice" {
			t.Errorf("metadata not persisted: got=%v", got)
		}
	})

	t.Run("短いpasswordで422", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "abc",
		})
		if resp.StatusCode != http.StatusUnprocessableEntity {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestTokenPasswordGrant(t *testing.T) {
	t.Run("正しい資格情報で200", func(t *testing.T) {
		_, srv := newTestHandler(t)
		body := map[string]string{"email": "alice@example.com", "password": "password123"}
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", body).Body.Close()

		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=password", body)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("誤ったpasswordで400 + invalid_grant + 'Invalid login credentials'", func(t *testing.T) {
		_, srv := newTestHandler(t)
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		}).Body.Close()

		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=password", map[string]string{
			"email": "alice@example.com", "password": "WRONG",
		})
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var e oauthError
		decodeBody(t, resp, &e)
		if e.Error != "invalid_grant" || !strings.Contains(e.ErrorDescription, "Invalid login credentials") {
			t.Errorf("got=%+v", e)
		}
	})

	t.Run("grant_type欠落で400", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestTokenRefreshGrant(t *testing.T) {
	t.Run("有効なrefresh_tokenでrotation", func(t *testing.T) {
		_, srv := newTestHandler(t)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": tr.RefreshToken,
		})
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var rotated tokenResponse
		decodeBody(t, resp, &rotated)
		if rotated.RefreshToken == tr.RefreshToken {
			t.Error("refresh_token not rotated")
		}
	})

	t.Run("不正なrefresh_tokenで400 + 'Invalid Refresh Token'", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": "nonexistent",
		})
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var e oauthError
		decodeBody(t, resp, &e)
		if !strings.Contains(e.ErrorDescription, "Invalid Refresh Token") {
			t.Errorf("description: %s", e.ErrorDescription)
		}
	})
}

func TestGetUser(t *testing.T) {
	t.Run("有効なBearerでuserを返す", func(t *testing.T) {
		_, srv := newTestHandler(t)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("Authorization欠落で401 + error_code='session_not_found' + X-Supabase-Api-Version", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/user", nil)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		if got := resp.Header.Get("X-Supabase-Api-Version"); got == "" {
			t.Error("X-Supabase-Api-Version header missing")
		}
		var body struct {
			ErrorCode string `json:"error_code"`
			Msg       string `json:"msg"`
		}
		decodeBody(t, resp, &body)
		if body.ErrorCode != "session_not_found" {
			t.Errorf("error_code: %s", body.ErrorCode)
		}
		if !strings.Contains(body.Msg, "Auth session missing") {
			t.Errorf("msg: %s", body.Msg)
		}
	})

	t.Run("注入clockを進めて期限切れJWTで401", func(t *testing.T) {
		now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		_, srv := newHandlerWithClock(t, func() time.Time { return now })
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		now = now.Add(2 * time.Hour)
		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestLogout(t *testing.T) {
	t.Run("Authorization無しでも204を返す（GoTrue互換）", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/logout", nil)
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("有効なBearerで204 + refresh_token失効", func(t *testing.T) {
		_, srv := newTestHandler(t)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/auth/v1/logout", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		resp.Body.Close()

		refresh := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": tr.RefreshToken,
		})
		if refresh.StatusCode != http.StatusBadRequest {
			t.Errorf("refresh after logout status: %d", refresh.StatusCode)
		}
	})
}

func TestAdminDeleteUser(t *testing.T) {
	t.Run("有効なIDで200 + ユーザー削除", func(t *testing.T) {
		_, srv := newTestHandler(t)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		resp := doJSON(t, srv, http.MethodDelete, "/auth/v1/admin/users/"+tr.User.ID, nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("存在しないIDで404", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodDelete, "/auth/v1/admin/users/nonexistent", nil)
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestAdminListUsers(t *testing.T) {
	t.Run("登録ユーザを返しページネーションヘッダも付与する", func(t *testing.T) {
		_, srv := newTestHandler(t)
		for _, e := range []string{"a@example.com", "b@example.com", "c@example.com"} {
			doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
				"email": e, "password": "password123",
			}).Body.Close()
		}
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=2", nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		if got := resp.Header.Get("x-total-count"); got != "3" {
			t.Errorf("x-total-count: %s", got)
		}
		if link := resp.Header.Get("Link"); !strings.Contains(link, `rel="next"`) {
			t.Errorf("Link must include rel=next: %s", link)
		}
	})

	t.Run("最終ページではnextが付かない", func(t *testing.T) {
		_, srv := newTestHandler(t)
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		}).Body.Close()
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=50", nil)
		if link := resp.Header.Get("Link"); strings.Contains(link, `rel="next"`) {
			t.Errorf("Link should not include rel=next: %s", link)
		}
	})
}

func TestHealthAndSettings(t *testing.T) {
	t.Run("/health は200で name=GoTrue を返す", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/health", nil)
		var body map[string]any
		decodeBody(t, resp, &body)
		if body["name"] != "GoTrue" {
			t.Errorf("name: %v", body["name"])
		}
	})

	t.Run("/settings は mailer_autoconfirm=true", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/settings", nil)
		var body map[string]any
		decodeBody(t, resp, &body)
		if body["mailer_autoconfirm"] != true {
			t.Errorf("mailer_autoconfirm: %v", body["mailer_autoconfirm"])
		}
	})
}

func TestEmulatorExtensions(t *testing.T) {
	t.Run("/reset で全データが消える", func(t *testing.T) {
		_, srv := newTestHandler(t)
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		}).Body.Close()
		resp := doJSON(t, srv, http.MethodPost, "/__emulator/reset", nil)
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("status: %d", resp.StatusCode)
		}

		retry := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if retry.StatusCode != http.StatusOK {
			t.Errorf("retry status: %d", retry.StatusCode)
		}
	})

	t.Run("/snapshot は空時に snake_case の空配列を返す", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodGet, "/__emulator/snapshot", nil)
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		body := string(raw)
		for _, key := range []string{`"users":[]`, `"sessions":[]`, `"refresh_tokens":[]`} {
			if !strings.Contains(body, key) {
				t.Errorf("snapshot must contain %s: %s", key, body)
			}
		}
	})

	t.Run("/users で seed できる", func(t *testing.T) {
		_, srv := newTestHandler(t)
		resp := doJSON(t, srv, http.MethodPost, "/__emulator/users", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestRequireAPIKey(t *testing.T) {
	newAuthHandler := func(t *testing.T) *httptest.Server {
		t.Helper()
		st := store.New(store.Config{})
		h := New(Config{
			JWTSecret:      config.DefaultJWTSecret,
			RequireAPIKey:  true,
			AnonKey:        config.DefaultAnonKey,
			ServiceRoleKey: config.DefaultServiceRoleKey,
		}, st)
		mux := http.NewServeMux()
		h.Mount(mux)
		srv := httptest.NewServer(mux)
		t.Cleanup(srv.Close)
		return srv
	}

	t.Run("apikey欠落で401", func(t *testing.T) {
		srv := newAuthHandler(t)
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "a@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("正しい anon キーで通る", func(t *testing.T) {
		srv := newAuthHandler(t)
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/auth/v1/signup",
			bytes.NewReader([]byte(`{"email":"a@example.com","password":"password123"}`)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("apikey", config.DefaultAnonKey)
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("admin削除はservice_role以外で403", func(t *testing.T) {
		srv := newAuthHandler(t)
		req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/auth/v1/admin/users/x", nil)
		req.Header.Set("apikey", config.DefaultAnonKey)
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusForbidden {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}
