package handler

func Logout(h *Handler) {
	// GoTrue は logout を冪等として扱い、Bearer 無し/期限切れでも 204 を返す。
	// access_token が exp 切れでも session を revoke すべきなので、署名のみ検証してから
	// claims を取り出す（exp 検証を絡めると expired token で revoke が走らず、
	// 同 session の refresh_token がそのまま使えてしまう）。
	if token := h.Bearer(); token != "" {
		if err := h.tokens.VerifySignature(token); err == nil {
			if claims, err := h.tokens.DecodeUnverified(token); err == nil && claims.SessionID != "" {
				h.store.RevokeRefreshTokensBySession(claims.SessionID)
			}
		}
	}
	h.NoContent()
}
