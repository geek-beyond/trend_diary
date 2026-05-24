package handler

import (
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type SeedUser struct {
	store *store.Store
}

func NewSeedUser(st *store.Store) *SeedUser { return &SeedUser{store: st} }

type seedUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *SeedUser) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	resp := httpx.MustFromContext(r.Context())

	var req seedUserRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		resp.APIError(http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		resp.APIError(http.StatusBadRequest, "email and password are required")
		return
	}
	hash, err := store.HashPassword(req.Password)
	if err != nil {
		resp.APIError(http.StatusInternalServerError, err.Error())
		return
	}
	u, err := h.store.CreateUser(req.Email, hash)
	if err != nil {
		resp.APIError(http.StatusConflict, err.Error())
		return
	}
	resp.JSON(http.StatusCreated, u)
}
