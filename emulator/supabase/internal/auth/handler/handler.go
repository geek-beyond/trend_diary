package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

// supabase-js v2 (2024-01-01 以降) が error_code を typed error にマップする条件として、
// X-Supabase-Api-Version ヘッダを全エラーレスポンスに付与する必要がある。
const apiVersion = "2024-01-01"

type Func func(*Handler)

type Factory struct {
	store  *store.Store
	tokens *Tokens
}

func NewFactory(st *store.Store, tk *Tokens) *Factory {
	return &Factory{store: st, tokens: tk}
}

func (f *Factory) Handle(fn Func) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := &Handler{w: w, r: r, store: f.store, tokens: f.tokens}
		// handler 内 panic を 500 + JSON エラーに変換し、connection reset を防ぐ。
		defer func() {
			if rec := recover(); rec != nil {
				fmt.Fprintf(os.Stderr, "supabase-emulator: handler panic: %v\n", rec)
				h.ErrorCode(http.StatusInternalServerError, "unexpected_failure", "internal server error")
			}
		}()
		fn(h)
	})
}

// written フラグで JSON/NoContent/Error 系の二重呼び出しを no-op にし、
// superfluous WriteHeader / body 連結を防ぐ。
type Handler struct {
	w       http.ResponseWriter
	r       *http.Request
	store   *store.Store
	tokens  *Tokens
	written bool
}

func (h *Handler) Request() *http.Request   { return h.r }
func (h *Handler) Context() context.Context { return h.r.Context() }
func (h *Handler) Store() *store.Store      { return h.store }
func (h *Handler) Tokens() *Tokens          { return h.tokens }
func (h *Handler) Header() http.Header      { return h.w.Header() }
func (h *Handler) Path(name string) string  { return h.r.PathValue(name) }
func (h *Handler) Query(name string) string { return h.r.URL.Query().Get(name) }

// supabase-js は gotrue_meta_security 等の追加フィールドを送るため DisallowUnknownFields は付けない。
func (h *Handler) ReadJSON(dst any) error {
	return json.NewDecoder(h.r.Body).Decode(dst)
}

func (h *Handler) Bearer() string {
	v := h.r.Header.Get("Authorization")
	if v == "" {
		return ""
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(v, prefix) {
		return ""
	}
	return strings.TrimSpace(v[len(prefix):])
}

func (h *Handler) JSON(status int, body any) {
	if h.written {
		return
	}
	h.written = true
	h.w.Header().Set("Content-Type", "application/json")
	h.w.WriteHeader(status)
	if body == nil {
		return
	}
	if err := json.NewEncoder(h.w).Encode(body); err != nil {
		// WriteHeader 既送のためレスポンスでは挽回不可。半端 JSON の事実だけ stderr に残す。
		fmt.Fprintf(os.Stderr, "supabase-emulator: response encode failed: %v\n", err)
	}
}

// RFC 7230 §3.3.2 に従い、204 では Content-Type / Content-Length を出さない。
func (h *Handler) NoContent() {
	if h.written {
		return
	}
	h.written = true
	h.w.Header().Del("Content-Type")
	h.w.Header().Del("Content-Length")
	h.w.WriteHeader(http.StatusNoContent)
}

// Error / ErrorCode / OAuth はそれぞれ別の JSON 形を使う:
//   - サインアップ系: {"code":"N","error_code":"...","msg":"..."}
//   - トークン系:     {"error":"...","error_description":"..."}
//
// アプリ側の文字列マッチ判定（"already registered" / "Invalid login credentials" /
// "Auth session missing"）と整合させるため、msg / error_description の値は変更しないこと。
// Code は string で出す（supabase-js v2 strict path は typeof === 'string' を要求）。

type apiErrorBody struct {
	Code      string `json:"code"`
	ErrorCode string `json:"error_code,omitempty"`
	Msg       string `json:"msg"`
}

type oauthErrorBody struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func (h *Handler) Error(status int, msg string) {
	h.w.Header().Set("X-Supabase-Api-Version", apiVersion)
	h.JSON(status, apiErrorBody{Code: strconv.Itoa(status), Msg: msg})
}

func (h *Handler) ErrorCode(status int, errCode, msg string) {
	h.w.Header().Set("X-Supabase-Api-Version", apiVersion)
	h.JSON(status, apiErrorBody{Code: strconv.Itoa(status), ErrorCode: errCode, Msg: msg})
}

func (h *Handler) OAuth(status int, errCode, description string) {
	h.w.Header().Set("X-Supabase-Api-Version", apiVersion)
	h.JSON(status, oauthErrorBody{Error: errCode, ErrorDescription: description})
}
