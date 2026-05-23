package auth

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/jwt"
)

func newTestService(t *testing.T) *Service {
	t.Helper()
	return NewService(Config{
		JWTSecret:      jwt.DefaultSecret,
		JWTIssuer:      "http://127.0.0.1:54321/auth/v1",
		AccessTokenTTL: time.Hour,
		ReuseInterval:  10 * time.Second,
		AnonKey:        jwt.AnonKey,
		ServiceRoleKey: jwt.ServiceRoleKey,
	})
}

func newTestServer(t *testing.T, svc *Service) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	svc.Mount(mux)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
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
		svc := newTestService(t)
		srv := newTestServer(t, svc)

		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email":    "alice@example.com",
			"password": "password123",
		})
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: got=%d want=200", resp.StatusCode)
		}
		var tr tokenResponse
		decodeBody(t, resp, &tr)
		if tr.AccessToken == "" {
			t.Fatal("access_token is empty")
		}
		if tr.RefreshToken == "" {
			t.Fatal("refresh_token is empty")
		}
		if tr.TokenType != "bearer" {
			t.Errorf("token_type: %s", tr.TokenType)
		}
		if tr.ExpiresIn != 3600 {
			t.Errorf("expires_in: %d", tr.ExpiresIn)
		}
		if tr.User == nil || tr.User.Email != "alice@example.com" {
			t.Errorf("user mismatch: %+v", tr.User)
		}

		// JWT検証
		claims, err := jwt.Verify(tr.AccessToken, jwt.DefaultSecret)
		if err != nil {
			t.Fatalf("verify access_token: %v", err)
		}
		if claims.Subject != tr.User.ID {
			t.Errorf("sub mismatch")
		}
		if claims.Role != "authenticated" {
			t.Errorf("role: %s", claims.Role)
		}
	})

	t.Run("email欠落で400", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"password": "password123",
		})
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("既存emailで422 + 'already registered' を含む", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		body := map[string]string{"email": "alice@example.com", "password": "password123"}

		first := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", body)
		first.Body.Close()
		if first.StatusCode != http.StatusOK {
			t.Fatalf("first signup status: %d", first.StatusCode)
		}

		second := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", body)
		if second.StatusCode != http.StatusUnprocessableEntity {
			t.Fatalf("second status: %d", second.StatusCode)
		}
		var e apiError
		decodeBody(t, second, &e)
		if !strings.Contains(e.Msg, "already registered") {
			t.Errorf("msg must contain 'already registered': %s", e.Msg)
		}
	})

	t.Run("短すぎるパスワードで422", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email":    "alice@example.com",
			"password": "abc",
		})
		if resp.StatusCode != http.StatusUnprocessableEntity {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestTokenPasswordGrant(t *testing.T) {
	t.Run("正しい資格情報で200とtokenResponseを返す", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		signupBody := map[string]string{"email": "alice@example.com", "password": "password123"}
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", signupBody)
		su.Body.Close()

		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=password", signupBody)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var tr tokenResponse
		decodeBody(t, resp, &tr)
		if tr.AccessToken == "" || tr.RefreshToken == "" {
			t.Fatal("missing tokens")
		}
	})

	t.Run("誤ったpasswordで400 + invalid_grant", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
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
		if e.Error != "invalid_grant" {
			t.Errorf("error: %s", e.Error)
		}
		if !strings.Contains(strings.ToLower(e.ErrorDescription), "invalid login credentials") {
			t.Errorf("description must contain 'invalid login credentials': %s", e.ErrorDescription)
		}
	})

	t.Run("存在しないemailでも同様に400", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=password", map[string]string{
			"email": "nobody@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("grant_type欠落で400", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestGetUser(t *testing.T) {
	t.Run("有効なBearerでuserを返す", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		resp, err := srv.Client().Do(req)
		if err != nil {
			t.Fatalf("Do: %v", err)
		}
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var got User
		decodeBody(t, resp, &got)
		if got.Email != "alice@example.com" {
			t.Errorf("email: %s", got.Email)
		}
	})

	t.Run("Authorization欠落で401 + AuthSessionMissingError", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/user", nil)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var e apiError
		decodeBody(t, resp, &e)
		if !strings.Contains(e.Msg, "Auth session missing") {
			t.Errorf("msg must contain 'Auth session missing': %s", e.Msg)
		}
	})

	t.Run("期限切れJWTで401", func(t *testing.T) {
		now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		svc := NewService(Config{
			JWTSecret:      jwt.DefaultSecret,
			JWTIssuer:      "http://127.0.0.1:54321/auth/v1",
			AccessTokenTTL: time.Hour,
			Clock:          func() time.Time { return now },
		})
		srv := newTestServer(t, svc)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		// クロックを2時間進めるためにaccessTokenの中身のexpを偽造するのは難しい
		// 代わりに、exp=過去のJWTを手動で作る
		expiredClaims := jwt.Claims{
			Subject:  tr.User.ID,
			Issuer:   "http://127.0.0.1:54321/auth/v1",
			Audience: "authenticated",
			Role:     "authenticated",
			Email:    "alice@example.com",
			IssuedAt: time.Now().Add(-2 * time.Hour).Unix(),
			Expiry:   time.Now().Add(-time.Hour).Unix(),
		}
		expired, err := jwt.Sign(expiredClaims, jwt.DefaultSecret)
		if err != nil {
			t.Fatalf("Sign: %v", err)
		}
		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+expired)
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestLogout(t *testing.T) {
	t.Run("有効なBearerで204 + refresh tokenが失効", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
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

		// refresh_token も無効化されているはず
		refresh := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": tr.RefreshToken,
		})
		if refresh.StatusCode != http.StatusBadRequest {
			t.Errorf("refresh after logout status: %d", refresh.StatusCode)
		}
	})
}

func TestTokenRefreshGrant(t *testing.T) {
	t.Run("有効なrefresh_tokenでrotationした新トークンを返す", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		// 同じiat秒内だとaccess_tokenが偶然一致しうるので1秒待たない代わりにrefresh_tokenだけ確認
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": tr.RefreshToken,
		})
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var rotated tokenResponse
		decodeBody(t, resp, &rotated)
		if rotated.RefreshToken == "" {
			t.Fatal("rotated refresh_token empty")
		}
		if rotated.RefreshToken == tr.RefreshToken {
			t.Error("refresh_token not rotated")
		}
		if rotated.User == nil || rotated.User.ID != tr.User.ID {
			t.Error("user mismatch in rotated response")
		}
	})

	t.Run("不正なrefresh_tokenで400 + invalid_grant + 'Invalid Refresh Token'", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": "nonexistent",
		})
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var e oauthError
		decodeBody(t, resp, &e)
		if e.Error != "invalid_grant" {
			t.Errorf("error: %s", e.Error)
		}
		if !strings.Contains(e.ErrorDescription, "Invalid Refresh Token") {
			t.Errorf("description: %s", e.ErrorDescription)
		}
	})

	t.Run("reuse_interval内なら旧tokenでも同じ新tokenを取得できる", func(t *testing.T) {
		now := time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC)
		svc := NewService(Config{
			JWTSecret:      jwt.DefaultSecret,
			AccessTokenTTL: time.Hour,
			ReuseInterval:  10 * time.Second,
			Clock:          func() time.Time { return now },
		})
		srv := newTestServer(t, svc)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		first := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": tr.RefreshToken,
		})
		var rotated tokenResponse
		decodeBody(t, first, &rotated)

		second := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": tr.RefreshToken,
		})
		if second.StatusCode != http.StatusOK {
			t.Fatalf("second status: %d", second.StatusCode)
		}
		var reused tokenResponse
		decodeBody(t, second, &reused)
		if reused.RefreshToken != rotated.RefreshToken {
			t.Errorf("reuse must yield same token: rotated=%s reused=%s", rotated.RefreshToken, reused.RefreshToken)
		}
	})
}

func TestAdminListUsers(t *testing.T) {
	t.Run("登録ユーザを返す", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		for _, e := range []string{"a@example.com", "b@example.com", "c@example.com"} {
			doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
				"email": e, "password": "password123",
			}).Body.Close()
		}
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=200", nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var body struct {
			Users []User `json:"users"`
			Aud   string `json:"aud"`
		}
		decodeBody(t, resp, &body)
		if len(body.Users) != 3 {
			t.Errorf("users count: %d", len(body.Users))
		}
		if body.Aud != "authenticated" {
			t.Errorf("aud: %s", body.Aud)
		}
	})

	t.Run("per_pageでページング", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		for _, e := range []string{"a@example.com", "b@example.com", "c@example.com"} {
			doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
				"email": e, "password": "password123",
			}).Body.Close()
		}
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=2", nil)
		var body struct {
			Users []User `json:"users"`
		}
		decodeBody(t, resp, &body)
		if len(body.Users) != 2 {
			t.Errorf("page1 users count: %d", len(body.Users))
		}
	})
}

func TestAdminDeleteUser(t *testing.T) {
	t.Run("有効なIDで200 + ユーザ削除", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		resp := doJSON(t, srv, http.MethodDelete, "/auth/v1/admin/users/"+tr.User.ID, nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}

		// 再ログイン不可
		login := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=password", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if login.StatusCode != http.StatusBadRequest {
			t.Errorf("login after delete status: %d", login.StatusCode)
		}
	})

	t.Run("存在しないIDで404", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodDelete, "/auth/v1/admin/users/nonexistent-id", nil)
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestHealthAndSettings(t *testing.T) {
	t.Run("health は200 + GoTrue 名前を含む", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/health", nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var body map[string]any
		decodeBody(t, resp, &body)
		if body["name"] != "GoTrue" {
			t.Errorf("name: %v", body["name"])
		}
	})

	t.Run("settings は mailer_autoconfirm=true", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/settings", nil)
		var body map[string]any
		decodeBody(t, resp, &body)
		if body["mailer_autoconfirm"] != true {
			t.Errorf("mailer_autoconfirm: %v", body["mailer_autoconfirm"])
		}
	})
}

func TestEmulatorExtensions(t *testing.T) {
	t.Run("reset で全データが消える", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		}).Body.Close()

		resp := doJSON(t, srv, http.MethodPost, "/__emulator/reset", nil)
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("status: %d", resp.StatusCode)
		}

		// 再度同じemailでsignupできる
		retry := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if retry.StatusCode != http.StatusOK {
			t.Fatalf("retry status: %d", retry.StatusCode)
		}
	})

	t.Run("snapshot で users をダンプする", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		}).Body.Close()

		resp := doJSON(t, srv, http.MethodGet, "/__emulator/snapshot", nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		var snap Snapshot
		decodeBody(t, resp, &snap)
		if len(snap.Users) != 1 {
			t.Errorf("user count: %d", len(snap.Users))
		}
	})

	t.Run("seed users でユーザを直接登録", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodPost, "/__emulator/users", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}

func TestRequireAPIKey(t *testing.T) {
	t.Run("RequireAPIKey=true: apikey欠落で401", func(t *testing.T) {
		svc := NewService(Config{
			JWTSecret:      jwt.DefaultSecret,
			RequireAPIKey:  true,
			AnonKey:        jwt.AnonKey,
			ServiceRoleKey: jwt.ServiceRoleKey,
		})
		srv := newTestServer(t, svc)
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("RequireAPIKey=true: 正しいanonキーで通る", func(t *testing.T) {
		svc := NewService(Config{
			JWTSecret:      jwt.DefaultSecret,
			RequireAPIKey:  true,
			AnonKey:        jwt.AnonKey,
			ServiceRoleKey: jwt.ServiceRoleKey,
		})
		srv := newTestServer(t, svc)
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/auth/v1/signup",
			bytes.NewReader([]byte(`{"email":"alice@example.com","password":"password123"}`)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("apikey", jwt.AnonKey)
		resp, err := srv.Client().Do(req)
		if err != nil {
			t.Fatalf("Do: %v", err)
		}
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})

	t.Run("RequireAPIKey=true: admin削除でservice_role以外は403", func(t *testing.T) {
		svc := NewService(Config{
			JWTSecret:      jwt.DefaultSecret,
			RequireAPIKey:  true,
			AnonKey:        jwt.AnonKey,
			ServiceRoleKey: jwt.ServiceRoleKey,
		})
		srv := newTestServer(t, svc)
		req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/auth/v1/admin/users/some-id", nil)
		req.Header.Set("apikey", jwt.AnonKey) // anon は admin できない
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusForbidden {
			t.Fatalf("status: %d", resp.StatusCode)
		}
	})
}
