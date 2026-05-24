package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

type passwordGrantRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshGrantRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func Token(h *Handler) {
	switch h.Query("grant_type") {
	case "password":
		tokenPassword(h)
	case "refresh_token":
		tokenRefresh(h)
	default:
		h.OAuth(http.StatusBadRequest, "unsupported_grant_type", "grant_type is required")
	}
}

func tokenPassword(h *Handler) {
	var req passwordGrantRequest
	if err := h.ReadJSON(&req); err != nil {
		h.OAuth(http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	// signup 側で TrimSpace してから保存するので、login も同じ正規化を行わないと
	// トレーリングスペース付き email でログインできない非対称が生まれる。
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		h.OAuth(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	u, ok := h.store.FindUserByEmail(req.Email)
	if !ok || !store.VerifyPassword(u.PasswordHash, req.Password) {
		h.OAuth(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	h.store.UpdateLastSignIn(u.ID)
	// 並行 DeleteUser で消えていたら nil で Issue に渡って panic するため、
	// FindUserByID の ok を見て invalid_grant にフォールバックする。
	fresh, ok := h.store.FindUserByID(u.ID)
	if !ok {
		h.OAuth(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	tr, err := h.tokens.Issue(fresh)
	if err != nil {
		h.Error(http.StatusInternalServerError, err.Error())
		return
	}
	h.JSON(http.StatusOK, tr)
}

func tokenRefresh(h *Handler) {
	var req refreshGrantRequest
	if err := h.ReadJSON(&req); err != nil {
		h.OAuth(http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	if req.RefreshToken == "" {
		h.OAuth(http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
		return
	}

	newRT, u, err := h.store.ConsumeRefreshToken(req.RefreshToken)
	if err != nil {
		if errors.Is(err, store.ErrInvalidRefreshToken) {
			h.OAuth(http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
			return
		}
		h.Error(http.StatusInternalServerError, err.Error())
		return
	}

	tr, err := h.tokens.Build(u, newRT.SessionID, newRT.Token)
	if err != nil {
		h.Error(http.StatusInternalServerError, err.Error())
		return
	}
	h.JSON(http.StatusOK, tr)
}
