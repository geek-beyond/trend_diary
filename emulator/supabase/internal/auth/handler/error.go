package handler

import (
	"net/http"
	"strconv"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

// GoTrue 互換のエラーレスポンスは状況により形式が2種類ある:
//   - サインアップ系 (apiError): {"code":"N", "error_code":"...", "msg":"..."}
//   - トークン系 (oauthError):   {"error":"...", "error_description":"..."}
//
// supabase-js v2 の 2024-01-01 strict path は `typeof data.code === 'string'` を要求するため
// Code を string で出す。同じく X-Supabase-Api-Version + error_code を必ず付与して
// AuthSessionMissingError などの instanceof マッピングを有効にする。
// アプリ側の文字列マッチ判定（"already registered" / "Invalid login credentials" /
// "Auth session missing"）と整合させるため、msg / error_description の値は変更しないこと。

const apiVersion = "2024-01-01"

type apiError struct {
	Code      string `json:"code"`
	ErrorCode string `json:"error_code,omitempty"`
	Msg       string `json:"msg"`
}

type oauthError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func writeAPIError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("X-Supabase-Api-Version", apiVersion)
	httpx.WriteJSON(w, status, apiError{Code: strconv.Itoa(status), Msg: msg})
}

func writeAPIErrorWithCode(w http.ResponseWriter, status int, errCode, msg string) {
	w.Header().Set("X-Supabase-Api-Version", apiVersion)
	httpx.WriteJSON(w, status, apiError{Code: strconv.Itoa(status), ErrorCode: errCode, Msg: msg})
}

func writeOAuthError(w http.ResponseWriter, status int, errCode, description string) {
	w.Header().Set("X-Supabase-Api-Version", apiVersion)
	httpx.WriteJSON(w, status, oauthError{Error: errCode, ErrorDescription: description})
}
