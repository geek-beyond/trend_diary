package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/config"
)

const testIssuer = "http://127.0.0.1:54321/auth/v1"

func newStoreWith(clock func() time.Time) *store.Store {
	return store.New(store.Config{Clock: clock, ReuseInterval: 10 * time.Second})
}

func newTokensWith(st *store.Store, clock func() time.Time) *Tokens {
	if clock == nil {
		clock = time.Now
	}
	return NewTokens(st, config.DefaultJWTSecret, testIssuer, time.Hour, clock)
}

// seed は store にユーザを直接登録して TokenResponse を返す（テスト用ヘルパ）。
func seed(t *testing.T, st *store.Store, tk *Tokens, email, password string) *TokenResponse {
	t.Helper()
	hash, _ := store.HashPassword(password)
	u, err := st.CreateUser(email, hash)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	resp, err := tk.Issue(u)
	if err != nil {
		t.Fatalf("seed issue: %v", err)
	}
	return resp
}

func newRequest(t *testing.T, method, target string, body any) *http.Request {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, target, rdr)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return req
}

func decodeJSON(t *testing.T, rec *httptest.ResponseRecorder, dst any) {
	t.Helper()
	if err := json.NewDecoder(rec.Body).Decode(dst); err != nil {
		t.Fatalf("decode: %v", err)
	}
}
