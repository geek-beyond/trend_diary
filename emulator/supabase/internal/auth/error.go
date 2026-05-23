package auth

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

// GoTrue互換のエラーレスポンスは状況により形式が2種類ある。
//
//   - 4xxサインアップ系: {"code":N, "msg":"..."} （内部HTTPステータスを含む）
//   - 4xxトークン系:     {"error":"...", "error_description":"..."}
//
// 既存のapplication側 isUserAlreadyExistsError / isInvalidCredentialsError の文字列マッチに
// 合致させるため、msg / error_description の値は絶対に変更しないこと。

type apiError struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
}

type oauthError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func writeAPIError(w http.ResponseWriter, status int, msg string) {
	httpx.WriteJSON(w, status, apiError{Code: status, Msg: msg})
}

func writeOAuthError(w http.ResponseWriter, status int, errCode, description string) {
	httpx.WriteJSON(w, status, oauthError{Error: errCode, ErrorDescription: description})
}
