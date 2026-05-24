package handler

import (
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

type seedUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func SeedUser(h *Handler) {
	var req seedUserRequest
	if err := h.ReadJSON(&req); err != nil {
		h.Error(http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		h.Error(http.StatusBadRequest, "email and password are required")
		return
	}
	hash, err := store.HashPassword(req.Password)
	if err != nil {
		h.Error(http.StatusInternalServerError, err.Error())
		return
	}
	u, err := h.store.CreateUser(req.Email, hash)
	if err != nil {
		h.Error(http.StatusConflict, err.Error())
		return
	}
	h.JSON(http.StatusCreated, u)
}
