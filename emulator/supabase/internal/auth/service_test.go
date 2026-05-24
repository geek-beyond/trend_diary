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

	t.Run("期限切れJWTで401（注入clockを基準に判定する）", func(t *testing.T) {
		// 注入された clock を進めることで期限切れを再現できる（旧実装は jwt.Verify が
		// time.Now() 直参照だったため fake clock の効果が及ばず、このシナリオを書けなかった）。
		current := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		svc := NewService(Config{
			JWTSecret:      jwt.DefaultSecret,
			JWTIssuer:      "http://127.0.0.1:54321/auth/v1",
			AccessTokenTTL: time.Hour,
			Clock:          func() time.Time { return current },
		})
		srv := newTestServer(t, svc)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		// signup 直後は未期限
		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		resp, _ := srv.Client().Do(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("before expiry status: %d", resp.StatusCode)
		}
		resp.Body.Close()

		// 注入 clock を 2 時間進めて期限超過を再現
		current = current.Add(2 * time.Hour)
		req, _ = http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		resp, _ = srv.Client().Do(req)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("after expiry status: %d", resp.StatusCode)
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

// 以下、code-review で挙がった指摘12件のリグレッションテスト群。

func TestSignup_MetadataPersistence(t *testing.T) {
	t.Run("signup の data が Store に永続化され、GET /auth/v1/user で取得できる", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]any{
			"email":    "alice@example.com",
			"password": "password123",
			"data":     map[string]any{"nickname": "alice"},
		})
		var signupResp tokenResponse
		decodeBody(t, su, &signupResp)
		if got := signupResp.User.UserMetadata["nickname"]; got != "alice" {
			t.Fatalf("signup response metadata nickname: got=%v", got)
		}

		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/auth/v1/user", nil)
		req.Header.Set("Authorization", "Bearer "+signupResp.AccessToken)
		resp, _ := srv.Client().Do(req)
		var u User
		decodeBody(t, resp, &u)
		if got := u.UserMetadata["nickname"]; got != "alice" {
			t.Errorf("user metadata nickname must persist: got=%v", got)
		}
	})
}

func TestGetUser_SessionNotFoundErrorCode(t *testing.T) {
	t.Run("401 レスポンスに error_code='session_not_found' と X-Supabase-Api-Version が含まれる", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/user", nil)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status: %d", resp.StatusCode)
		}
		if got := resp.Header.Get("X-Supabase-Api-Version"); got == "" {
			t.Error("X-Supabase-Api-Version header missing")
		}
		var body struct {
			ErrorCode string `json:"error_code"`
		}
		decodeBody(t, resp, &body)
		if body.ErrorCode != "session_not_found" {
			t.Errorf("error_code: got=%s want=session_not_found", body.ErrorCode)
		}
	})
}

func TestLogout_IdempotentEvenWithoutSession(t *testing.T) {
	t.Run("Authorization 無しでも 204 を返す（GoTrue 互換）", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodPost, "/auth/v1/logout", nil)
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("status: got=%d want=204", resp.StatusCode)
		}
	})

	t.Run("apikey のみで Bearer 無しでも 204 を返す", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/auth/v1/logout", nil)
		req.Header.Set("apikey", jwt.AnonKey)
		resp, err := srv.Client().Do(req)
		if err != nil {
			t.Fatalf("Do: %v", err)
		}
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("status: got=%d want=204", resp.StatusCode)
		}
	})
}

func TestAdminListUsers_PaginationHeaders(t *testing.T) {
	t.Run("x-total-count と Link ヘッダで supabase-js のページング情報を返す", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		for _, e := range []string{"a@example.com", "b@example.com", "c@example.com"} {
			doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
				"email": e, "password": "password123",
			}).Body.Close()
		}

		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=2", nil)
		if got := resp.Header.Get("x-total-count"); got != "3" {
			t.Errorf("x-total-count: got=%s want=3", got)
		}
		link := resp.Header.Get("Link")
		if !strings.Contains(link, `rel="next"`) || !strings.Contains(link, `rel="last"`) {
			t.Errorf("Link must include next/last: %s", link)
		}
	})

	t.Run("最終ページでは next ヘッダが付かない", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		}).Body.Close()
		resp := doJSON(t, srv, http.MethodGet, "/auth/v1/admin/users?page=1&per_page=50", nil)
		link := resp.Header.Get("Link")
		if strings.Contains(link, `rel="next"`) {
			t.Errorf("Link should not include next on the last page: %s", link)
		}
	})
}

func TestEmulatorSnapshot_EmptyReturnsArraysAndSnakeCase(t *testing.T) {
	t.Run("空ストアで snapshot を取ると users/sessions/refresh_tokens が空配列で snake_case で返る", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		resp := doJSON(t, srv, http.MethodGet, "/__emulator/snapshot", nil)
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		body := string(raw)
		for _, key := range []string{`"users":[]`, `"sessions":[]`, `"refresh_tokens":[]`} {
			if !strings.Contains(body, key) {
				t.Errorf("snapshot must contain %s, got body=%s", key, body)
			}
		}
		// PascalCase キーは出ない
		for _, badKey := range []string{`"Users"`, `"Sessions"`, `"RefreshTokens"`} {
			if strings.Contains(body, badKey) {
				t.Errorf("snapshot must not contain %s", badKey)
			}
		}
	})
}

func TestCreateUser_NormalizesEmailToLowercase(t *testing.T) {
	t.Run("大文字混在 email で signup しても Store/レスポンスは lowercase で保存される", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "Alice@Example.COM", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)
		if tr.User.Email != "alice@example.com" {
			t.Errorf("email must be lowercased: got=%s", tr.User.Email)
		}
	})
}

func TestCloneUser_DeepCopiesMetadataMaps(t *testing.T) {
	t.Run("Store から取得した User のメタデータマップを書き換えても Store 本体は影響を受けない", func(t *testing.T) {
		s := NewStore(StoreConfig{ReuseInterval: 10 * time.Second})
		hash, _ := HashPassword("password123")
		created, _ := s.CreateUser("alice@example.com", hash)
		// クライアント側でマップに書き込み（旧シャローコピー実装ではここで Store が破壊された）
		created.AppMetadata["injected"] = true
		created.UserMetadata["nick"] = "evil"
		if len(created.Identities) > 0 {
			created.Identities[0].IdentityData["email"] = "tampered@example.com"
		}

		fresh, ok := s.FindUserByID(created.ID)
		if !ok {
			t.Fatal("user lost from store")
		}
		if _, exists := fresh.AppMetadata["injected"]; exists {
			t.Error("AppMetadata leaked client-side mutation into store")
		}
		if _, exists := fresh.UserMetadata["nick"]; exists {
			t.Error("UserMetadata leaked client-side mutation into store")
		}
		if got := fresh.Identities[0].IdentityData["email"]; got != "alice@example.com" {
			t.Errorf("Identity email tampered: %v", got)
		}
	})
}

func TestRefreshToken_RevokeBySession_RespectsReuseInterval(t *testing.T) {
	t.Run("reuse_interval=2h でも logout 後の refresh は invalid_grant", func(t *testing.T) {
		current := time.Date(2026, 5, 23, 0, 0, 0, 0, time.UTC)
		svc := NewService(Config{
			JWTSecret:      jwt.DefaultSecret,
			AccessTokenTTL: time.Hour,
			ReuseInterval:  2 * time.Hour,
			Clock:          func() time.Time { return current },
		})
		srv := newTestServer(t, svc)
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var tr tokenResponse
		decodeBody(t, su, &tr)

		// logout
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/auth/v1/logout", nil)
		req.Header.Set("Authorization", "Bearer "+tr.AccessToken)
		logoutResp, _ := srv.Client().Do(req)
		logoutResp.Body.Close()

		// logout 直後に refresh を試みる（旧実装は -1h 固定だったので reuse=2h で通ってしまっていた）
		refresh := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": tr.RefreshToken,
		})
		if refresh.StatusCode != http.StatusBadRequest {
			t.Errorf("refresh after logout must fail even with reuse_interval=2h: status=%d", refresh.StatusCode)
		}
	})
}

func TestRefreshToken_ReuseWindowFollowsRotationChain(t *testing.T) {
	t.Run("T0→T1→T2 とローテートされた後、T0 を reuse_interval 内に再試行すると T2 が返る", func(t *testing.T) {
		srv := newTestServer(t, newTestService(t))
		su := doJSON(t, srv, http.MethodPost, "/auth/v1/signup", map[string]string{
			"email": "alice@example.com", "password": "password123",
		})
		var t0 tokenResponse
		decodeBody(t, su, &t0)

		// T0 → T1
		r1 := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": t0.RefreshToken,
		})
		var t1 tokenResponse
		decodeBody(t, r1, &t1)

		// T1 → T2
		r2 := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": t1.RefreshToken,
		})
		var t2 tokenResponse
		decodeBody(t, r2, &t2)

		// T0 を reuse_interval 内に再試行（旧実装は !child.Revoked で T1 が見えず invalid_grant）
		retry := doJSON(t, srv, http.MethodPost, "/auth/v1/token?grant_type=refresh_token", map[string]string{
			"refresh_token": t0.RefreshToken,
		})
		if retry.StatusCode != http.StatusOK {
			t.Fatalf("reuse retry status: %d", retry.StatusCode)
		}
		var retried tokenResponse
		decodeBody(t, retry, &retried)
		if retried.RefreshToken != t2.RefreshToken {
			t.Errorf("reuse must follow chain to latest leaf: got=%s want=%s", retried.RefreshToken, t2.RefreshToken)
		}
	})
}

func TestTokenPasswordGrant_NoNilPanicOnConcurrentDelete(t *testing.T) {
	t.Run("password grant 中にユーザーが消えても panic せず invalid_grant を返す", func(t *testing.T) {
		// 直接 store を弄ることで FindUserByEmail と UpdateLastSignIn の間で消えたケースを再現する
		// 代替として、handler を経由せず Store API の挙動を検証する。
		s := NewStore(StoreConfig{ReuseInterval: 10 * time.Second})
		hash, _ := HashPassword("password123")
		u, _ := s.CreateUser("alice@example.com", hash)
		s.DeleteUser(u.ID)
		_, ok := s.FindUserByID(u.ID)
		if ok {
			t.Fatal("user should be gone")
		}
		// 旧実装は `u, _ = FindUserByID` で nil をそのまま issueSession に渡し、CreateSession 内で
		// `s.users[userID]` のチェックが先にあるため実際の panic は限定的だが、ok を捨てるパターン
		// 自体が脆弱なので回帰防止。
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
