package httpx

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
)

// apiVersion は supabase-js v2 (2024-01-01 以降) が error_code を typed error にマップする
// 条件として X-Supabase-Api-Version ヘッダを要求するため、全エラーレスポンスに付与する。
const apiVersion = "2024-01-01"

// Responder は単一の http.ResponseWriter をラップして JSON/エラー応答を一元化する。
// 各ハンドラは r.Context() 経由で取り出す（呼び出し側で *http.ResponseWriter を直接触らない）。
// 全エントリポイントで WithResponder middleware を通す前提のため、欠落は早期に panic させる。
type Responder struct {
	w http.ResponseWriter
}

func NewResponder(w http.ResponseWriter) *Responder { return &Responder{w: w} }

func (r *Responder) Header() http.Header { return r.w.Header() }

// JSON は Content-Type を付与して body を書き出す。body=nil なら本文を書かない。
func (r *Responder) JSON(status int, body any) {
	r.w.Header().Set("Content-Type", "application/json")
	r.w.WriteHeader(status)
	if body == nil {
		return
	}
	_ = json.NewEncoder(r.w).Encode(body)
}

func (r *Responder) NoContent() { r.w.WriteHeader(http.StatusNoContent) }

// APIError は GoTrue 互換の {"code","msg"} 形式（サインアップ系で使われる）を返す。
// Code は string で出すこと（supabase-js v2 strict path は typeof === 'string' を要求）。
func (r *Responder) APIError(status int, msg string) {
	r.w.Header().Set("X-Supabase-Api-Version", apiVersion)
	r.JSON(status, APIError{Code: strconv.Itoa(status), Msg: msg})
}

// APIErrorWithCode は error_code 付き。supabase-js の AuthSessionMissingError などの
// instanceof マッピングは error_code 文字列でしか発火しないので、必ずこの経路を使う。
func (r *Responder) APIErrorWithCode(status int, errCode, msg string) {
	r.w.Header().Set("X-Supabase-Api-Version", apiVersion)
	r.JSON(status, APIError{Code: strconv.Itoa(status), ErrorCode: errCode, Msg: msg})
}

// OAuthError は GoTrue 互換の {"error","error_description"} 形式（トークン系で使われる）を返す。
func (r *Responder) OAuthError(status int, errCode, description string) {
	r.w.Header().Set("X-Supabase-Api-Version", apiVersion)
	r.JSON(status, OAuthError{Error: errCode, ErrorDescription: description})
}

// APIError / OAuthError 構造体はレスポンス本文の JSON 形と、テスト/SDK からの decode 用に export する。
// アプリ側の文字列マッチ判定（"already registered" / "Invalid login credentials" /
// "Auth session missing"）と整合させるため、Msg / ErrorDescription の値は変更しないこと。
type APIError struct {
	Code      string `json:"code"`
	ErrorCode string `json:"error_code,omitempty"`
	Msg       string `json:"msg"`
}

type OAuthError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description,omitempty"`
}

type responderCtxKey struct{}

// WithContext は responder を context に詰めて返す。
func WithContext(ctx context.Context, r *Responder) context.Context {
	return context.WithValue(ctx, responderCtxKey{}, r)
}

// MustFromContext は context から Responder を取り出す。
// 全エントリポイントで WithResponder middleware を通している前提のため、
// 取り出せない場合は middleware 漏れの実装ミスとみなして panic させる。
func MustFromContext(ctx context.Context) *Responder {
	r, ok := ctx.Value(responderCtxKey{}).(*Responder)
	if !ok {
		panic("httpx: Responder not in context (forgot WithResponder middleware?)")
	}
	return r
}

// WithResponder は各リクエストごとに Responder を生成して context に詰める middleware。
// main.go では Handler ラッパとして mux 全体に被せる。テストでは handlertest 経由で同じく被せる。
func WithResponder(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := NewResponder(w)
		next.ServeHTTP(w, r.WithContext(WithContext(r.Context(), resp)))
	})
}
