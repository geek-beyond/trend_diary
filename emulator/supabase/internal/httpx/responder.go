package httpx

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
)

// apiVersion は supabase-js v2 (2024-01-01 以降) が error_code を typed error にマップする
// 条件として X-Supabase-Api-Version ヘッダを要求するため、全エラーレスポンスに付与する。
const apiVersion = "2024-01-01"

// Responder は単一の http.ResponseWriter をラップして JSON/エラー応答を一元化する。
// 各ハンドラは r.Context() 経由で取り出す（呼び出し側で *http.ResponseWriter を直接触らない）。
//
// 書き込み済みフラグを内部に持っているので、JSON / APIError / NoContent などを 2 回呼んでも
// 2 回目以降は no-op になり、superfluous WriteHeader / body 連結を防ぐ。
//
// JSON / APIError / OAuthError / NoContent は内部で WriteHeader を呼んでヘッダを確定する。
// それより前に Header() に書き込んだ値はレスポンスに反映されるが、確定後の Header().Set は
// net/http の仕様上 no-op になる。
type Responder struct {
	w       http.ResponseWriter
	written bool
}

func NewResponder(w http.ResponseWriter) *Responder { return &Responder{w: w} }

// Header は内部 ResponseWriter のヘッダを返す。WriteHeader を呼ぶ前に Set すること。
func (r *Responder) Header() http.Header { return r.w.Header() }

// JSON は Content-Type を付与して body を書き出す。body=nil なら本文を書かない。
// 2 回目以降の呼び出しは no-op。
func (r *Responder) JSON(status int, body any) {
	if r.written {
		return
	}
	r.written = true
	r.w.Header().Set("Content-Type", "application/json")
	r.w.WriteHeader(status)
	if body == nil {
		return
	}
	if err := json.NewEncoder(r.w).Encode(body); err != nil {
		// WriteHeader 既送なのでレスポンス側で挽回できない。最低限 stderr に出して
		// 半端な JSON を返した事実を残す（運用ログ収集の足がかり）。
		fmt.Fprintf(os.Stderr, "supabase-emulator: response encode failed: %v\n", err)
	}
}

// NoContent は 204 を返す。RFC 7230 §3.3.2 に従い Content-Type / Content-Length は削る。
// 2 回目以降の呼び出しは no-op。
func (r *Responder) NoContent() {
	if r.written {
		return
	}
	r.written = true
	r.w.Header().Del("Content-Type")
	r.w.Header().Del("Content-Length")
	r.w.WriteHeader(http.StatusNoContent)
}

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
// panic は WithResponder の recover で 500 JSON に変換される。
func MustFromContext(ctx context.Context) *Responder {
	r, ok := ctx.Value(responderCtxKey{}).(*Responder)
	if !ok {
		panic("httpx: Responder not in context (forgot WithResponder middleware?)")
	}
	return r
}

// WithResponder は各リクエストごとに Responder を生成し context に詰めて next を呼ぶ middleware。
// main.go では Handler ラッパとして mux 全体に被せる。テストでも handlertest.Serve 経由で同じく被せる。
//
// 重要な前提:
//   - next.ServeHTTP には raw w をそのまま渡している。すなわち Responder は内部で同じ w を握る。
//     そのため WithResponder は『最も内側の middleware』として配線すること。gzip/logging 等の
//     w-ラッパ middleware を後段に挟むと、Responder がそれを bypass して raw w に書いてしまう。
//   - 後段ハンドラが panic した場合（MustFromContext の panic 含む）、ここで recover して
//     500 + JSON エラーを返す。WriteHeader 既送なら written フラグの no-op で body 重複を防ぐ。
func WithResponder(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := NewResponder(w)
		defer func() {
			if rec := recover(); rec != nil {
				fmt.Fprintf(os.Stderr, "supabase-emulator: handler panic: %v\n", rec)
				resp.APIErrorWithCode(http.StatusInternalServerError, "unexpected_failure", "internal server error")
			}
		}()
		next.ServeHTTP(w, r.WithContext(WithContext(r.Context(), resp)))
	})
}
