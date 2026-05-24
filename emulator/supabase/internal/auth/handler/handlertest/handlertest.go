// Package handlertest は handler パッケージのテストで共用するヘルパ群を提供する。
package handlertest

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/config"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

const Issuer = "http://127.0.0.1:54321/auth/v1"

func NewStore(clock func() time.Time) *store.Store {
	return store.New(store.Config{Clock: clock, ReuseInterval: 10 * time.Second})
}

func NewTokens(st *store.Store, clock func() time.Time) *handler.Tokens {
	if clock == nil {
		clock = time.Now
	}
	return handler.NewTokens(st, config.DefaultJWTSecret, Issuer, time.Hour, clock)
}

// Seed は store に直接ユーザを登録し、access_token / refresh_token を発行する。
func Seed(t *testing.T, st *store.Store, tk *handler.Tokens, email, password string) *handler.TokenResponse {
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

// NewRequest は handler が要求する WithResponder middleware を済ませた *http.Request を返す。
// 本番では main.go が mux 全体に WithResponder を被せているのと同じセットアップを再現する。
func NewRequest(t *testing.T, method, target string, body any) *http.Request {
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
	// httptest.ResponseRecorder を都度作り直すと Responder の対象が変わるため、
	// テスト側は handlertest.Serve(...) を介して書き込み先を結合する想定。
	return req
}

// Serve は handler を WithResponder middleware で包んで実行する。
// テストは httptest.NewRecorder() を毎回作り、このヘルパ経由でハンドラを呼ぶ。
func Serve(h http.Handler, rec *httptest.ResponseRecorder, req *http.Request) {
	httpx.WithResponder(h).ServeHTTP(rec, req)
}

func DecodeJSON(t *testing.T, rec *httptest.ResponseRecorder, dst any) {
	t.Helper()
	if err := json.NewDecoder(rec.Body).Decode(dst); err != nil {
		t.Fatalf("decode: %v", err)
	}
}
