package handler

import "net/http"

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	// GoTrue は logout を冪等として扱い、Bearer 無し/anon/期限切れでも 204 を返す。
	// 旧実装は 401 を返していたため、supabase-js が session 期限切れで signOut を呼んだとき
	// アプリ層で AuthSessionMissingError が偽陽性発火していた。
	token := authBearer(r)
	if token != "" && token != h.cfg.AnonKey && token != h.cfg.ServiceRoleKey {
		if claims, err := h.verifyToken(token); err == nil && claims.SessionID != "" {
			h.store.RevokeRefreshTokensBySession(claims.SessionID)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}
