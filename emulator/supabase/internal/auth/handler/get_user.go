package handler

import "net/http"

func GetUser(h *Handler) {
	token := h.Bearer()
	if token == "" {
		// supabase-js は session_not_found に対し _removeSession() で SSR cookie を wipe する。
		// 認可ヘッダ自体が無いのは「セッション喪失」ではないので no_authorization で分離する。
		h.APIErrorWithCode(http.StatusUnauthorized, "no_authorization",
			"No Authorization header included in request")
		return
	}
	claims, err := h.tokens.Verify(token)
	if err != nil {
		// 署名不正・期限切れ・issuer mismatch は全部 bad_jwt（cookie wipe 対象外）。
		h.APIErrorWithCode(http.StatusUnauthorized, "bad_jwt", "invalid JWT: "+err.Error())
		return
	}
	u, ok := h.store.FindUserByID(claims.Subject)
	if !ok {
		// 署名は通ったが該当 user が消えている状態だけが本当の session_not_found。
		h.APIErrorWithCode(http.StatusUnauthorized, "session_not_found",
			"AuthSessionMissingError: Auth session missing!")
		return
	}
	h.JSON(http.StatusOK, u)
}
