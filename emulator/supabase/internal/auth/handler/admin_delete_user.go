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
	resp := httpx.MustFromContext(r.Context())

	id := r.PathValue("id")
	if id == "" {
		resp.APIError(http.StatusBadRequest, "user id is required")
		return
	}
	if err := h.store.DeleteUser(id); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			resp.APIError(http.StatusNotFound, "User not found")
			return
		}
		resp.APIError(http.StatusInternalServerError, err.Error())
		return
	}
	resp.JSON(http.StatusOK, map[string]any{})
}
