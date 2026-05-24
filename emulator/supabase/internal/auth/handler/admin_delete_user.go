package handler

import (
	"errors"
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

func AdminDeleteUser(h *Handler) {
	id := h.PathValue("id")
	if id == "" {
		h.APIError(http.StatusBadRequest, "user id is required")
		return
	}
	if err := h.store.DeleteUser(id); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			h.APIError(http.StatusNotFound, "User not found")
			return
		}
		h.APIError(http.StatusInternalServerError, err.Error())
		return
	}
	h.JSON(http.StatusOK, map[string]any{})
}
