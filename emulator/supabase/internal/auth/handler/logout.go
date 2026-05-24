package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

type Logout struct {
	store  *store.Store
	tokens *Tokens
}

func NewLogout(st *store.Store, tk *Tokens) *Logout {
	return &Logout{store: st, tokens: tk}
}

func (h *Logout) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// GoTrue は logout を冪等として扱い、Bearer 無し/期限切れでも 204 を返す。
	// 旧実装は 401 を返していたため、supabase-js が session 期限切れで signOut を呼んだとき
	// アプリ層で AuthSessionMissingError が偽陽性発火していた。
	if token := authBearer(r); token != "" {
		if claims, err := h.tokens.Verify(token); err == nil && claims.SessionID != "" {
			h.store.RevokeRefreshTokensBySession(claims.SessionID)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}
