package auth

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

// GoTrue互換のエラーレスポンスは状況により形式が2種類ある。
//
//   - 4xxサインアップ系: {"code":N, "error_code":"...", "msg":"..."} （HTTPステータス + 文字列error_code）
//   - 4xxトークン系:     {"error":"...", "error_description":"..."}
//
// 既存のapplication側 isUserAlreadyExistsError / isInvalidCredentialsError の文字列マッチに
// 合致させるため、msg / error_description の値は絶対に変更しないこと。
//
// supabase-js v2 は API バージョンが 2024-01-01 以降のレスポンスでのみ error_code を
// 専用エラー型（AuthSessionMissingError 等）にマップする。X-Supabase-Api-Version ヘッダを
// 必ず付与する必要があるため、writeAPIError 内で設定する。

const apiVersion = "2024-01-01"

type apiError struct {
	Code      int    `json:"code"`
	ErrorCode string `json:"error_code,omitempty"`
	Msg       string `json:"msg"`
}

type oauthError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func writeAPIError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("X-Supabase-Api-Version", apiVersion)
	httpx.WriteJSON(w, status, apiError{Code: status, Msg: msg})
}

// writeAPIErrorWithCode は supabase-js が instanceof マッピングに使う error_code 付きで返す。
func writeAPIErrorWithCode(w http.ResponseWriter, status int, errCode, msg string) {
	w.Header().Set("X-Supabase-Api-Version", apiVersion)
	httpx.WriteJSON(w, status, apiError{Code: status, ErrorCode: errCode, Msg: msg})
}

func writeOAuthError(w http.ResponseWriter, status int, errCode, description string) {
	w.Header().Set("X-Supabase-Api-Version", apiVersion)
	httpx.WriteJSON(w, status, oauthError{Error: errCode, ErrorDescription: description})
}
