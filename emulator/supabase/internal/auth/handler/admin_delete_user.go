package handler

import (
	"errors"
	"net/http"

	"github.com/geek-beyond/trend-diary/emulator/supabase/internal/auth/store"
)

func AdminDeleteUser(h *Handler) {
	id := h.Path("id")
	if id == "" {
		h.Error(http.StatusBadRequest, "user id is required")
		return
	}
	if err := h.store.DeleteUser(id); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			h.Error(http.StatusNotFound, "User not found")
			return
		}
		h.Error(http.StatusInternalServerError, err.Error())
		return
	}
	h.JSON(http.StatusOK, map[string]any{})
}
