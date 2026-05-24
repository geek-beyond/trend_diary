package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type GetUser struct {
	store  *store.Store
	tokens *Tokens
}

func NewGetUser(st *store.Store, tk *Tokens) *GetUser {
	return &GetUser{store: st, tokens: tk}
}

func (h *GetUser) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token := authBearer(r)
	if token == "" {
		// 認可ヘッダ自体が無いのは「セッション喪失」ではなく単に「未認証」。
		// session_not_found を返すと supabase-js が _removeSession() で SSR cookie を
		// wipe してしまうため、no_authorization で分離する。
		writeAPIErrorWithCode(w, http.StatusUnauthorized, "no_authorization",
			"No Authorization header included in request")
		return
	}
	claims, err := h.tokens.Verify(token)
	if err != nil {
		// 署名不正・期限切れ・issuer mismatch などは全部 bad_jwt。これも cookie wipe の対象外。
		writeAPIErrorWithCode(w, http.StatusUnauthorized, "bad_jwt", "invalid JWT: "+err.Error())
		return
	}
	u, ok := h.store.FindUserByID(claims.Subject)
	if !ok {
		// 署名は通ったが該当 user が消えている状態。これだけが本当の session_not_found。
		writeAPIErrorWithCode(w, http.StatusUnauthorized, "session_not_found",
			"AuthSessionMissingError: Auth session missing!")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u)
}
