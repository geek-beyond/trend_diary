package handler

import (
	"errors"
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

var errUnauthenticated = errors.New("handler: unauthenticated")

func (h *Handler) handleGetUser(w http.ResponseWriter, r *http.Request) {
	u, err := h.authenticateUser(r)
	if err != nil {
		// supabase-js v2 は X-Supabase-Api-Version + error_code='session_not_found' で
		// AuthSessionMissingError に instanceof マップする。アプリ側の msg 包含判定も残す。
		writeAPIErrorWithCode(w, http.StatusUnauthorized, "session_not_found",
			"AuthSessionMissingError: Auth session missing!")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u)
}

func (h *Handler) authenticateUser(r *http.Request) (*store.User, error) {
	token := authBearer(r)
	if token == "" {
		return nil, errUnauthenticated
	}
	// anon / service_role は user とみなさない
	if token == h.cfg.AnonKey || token == h.cfg.ServiceRoleKey {
		return nil, errUnauthenticated
	}
	c, err := h.verifyToken(token)
	if err != nil {
		return nil, errUnauthenticated
	}
	u, ok := h.store.FindUserByID(c.Subject)
	if !ok {
		return nil, errUnauthenticated
	}
	return u, nil
}
