package handler

import (
	"errors"
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type AdminDeleteUser struct {
	store *store.Store
}

func NewAdminDeleteUser(st *store.Store) *AdminDeleteUser {
	return &AdminDeleteUser{store: st}
}

func (h *AdminDeleteUser) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeAPIError(w, http.StatusBadRequest, "user id is required")
		return
	}
	if err := h.store.DeleteUser(id); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			writeAPIError(w, http.StatusNotFound, "User not found")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{})
}
