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
	u, ok := h.lookup(r)
	if !ok {
		// supabase-js v2 は X-Supabase-Api-Version + error_code='session_not_found' で
		// AuthSessionMissingError に instanceof マップする。アプリ側 msg 包含判定も残す。
		writeAPIErrorWithCode(w, http.StatusUnauthorized, "session_not_found",
			"AuthSessionMissingError: Auth session missing!")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u)
}

func (h *GetUser) lookup(r *http.Request) (*store.User, bool) {
	token := authBearer(r)
	if token == "" {
		return nil, false
	}
	c, err := h.tokens.Verify(token)
	if err != nil {
		return nil, false
	}
	return h.store.FindUserByID(c.Subject)
}
