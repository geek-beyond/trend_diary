package handler

import (
	"errors"
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

// tokenResponse は supabase-js が session として保持する GoTrue AccessTokenResponse。
type tokenResponse struct {
	AccessToken  string      `json:"access_token"`
	TokenType    string      `json:"token_type"`
	ExpiresIn    int64       `json:"expires_in"`
	ExpiresAt    int64       `json:"expires_at"`
	RefreshToken string      `json:"refresh_token"`
	User         *store.User `json:"user"`
}

type passwordGrantRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshGrantRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Handler) handleToken(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Query().Get("grant_type") {
	case "password":
		h.handleTokenPassword(w, r)
	case "refresh_token":
		h.handleTokenRefresh(w, r)
	default:
		writeOAuthError(w, http.StatusBadRequest, "unsupported_grant_type", "grant_type is required")
	}
}

func (h *Handler) handleTokenPassword(w http.ResponseWriter, r *http.Request) {
	var req passwordGrantRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	u, ok := h.store.FindUserByEmail(req.Email)
	if !ok || !store.VerifyPassword(u.PasswordHash, req.Password) {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	h.store.UpdateLastSignIn(u.ID)
	// 並行 DeleteUser で消えていたら nil で issueSession に渡って panic するので、
	// FindUserByID の ok を見て invalid_grant にフォールバックする。
	fresh, ok := h.store.FindUserByID(u.ID)
	if !ok {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	resp, err := h.issueSession(fresh)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handler) handleTokenRefresh(w http.ResponseWriter, r *http.Request) {
	var req refreshGrantRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	if req.RefreshToken == "" {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
		return
	}

	newRT, u, err := h.store.ConsumeRefreshToken(req.RefreshToken)
	if err != nil {
		if errors.Is(err, store.ErrInvalidRefreshToken) {
			writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp, err := h.buildTokenResponse(u, newRT.SessionID, newRT.Token)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, resp)
}
