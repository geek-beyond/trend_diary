package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

// Token は /auth/v1/token の grant_type 分岐を担う。
// password / refresh_token どちらも JWT 発行が必要なので Tokens を共有する。
type Token struct {
	store  *store.Store
	tokens *Tokens
}

func NewToken(st *store.Store, tk *Tokens) *Token {
	return &Token{store: st, tokens: tk}
}

type passwordGrantRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshGrantRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Token) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Query().Get("grant_type") {
	case "password":
		h.password(r)
	case "refresh_token":
		h.refresh(r)
	default:
		httpx.MustFromContext(r.Context()).OAuthError(http.StatusBadRequest, "unsupported_grant_type", "grant_type is required")
	}
}

func (h *Token) password(r *http.Request) {
	resp := httpx.MustFromContext(r.Context())

	var req passwordGrantRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		resp.OAuthError(http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	// signup 側で TrimSpace してから保存するので、login も同じ正規化を行わないと
	// トレーリングスペース付き email でログインできない非対称が生まれる。
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		resp.OAuthError(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	u, ok := h.store.FindUserByEmail(req.Email)
	if !ok || !store.VerifyPassword(u.PasswordHash, req.Password) {
		resp.OAuthError(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	h.store.UpdateLastSignIn(u.ID)
	// 並行 DeleteUser で消えていたら nil で Issue に渡って panic するため、
	// FindUserByID の ok を見て invalid_grant にフォールバックする。
	fresh, ok := h.store.FindUserByID(u.ID)
	if !ok {
		resp.OAuthError(http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	tr, err := h.tokens.Issue(fresh)
	if err != nil {
		resp.APIError(http.StatusInternalServerError, err.Error())
		return
	}
	resp.JSON(http.StatusOK, tr)
}

func (h *Token) refresh(r *http.Request) {
	resp := httpx.MustFromContext(r.Context())

	var req refreshGrantRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		resp.OAuthError(http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	if req.RefreshToken == "" {
		resp.OAuthError(http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
		return
	}

	newRT, u, err := h.store.ConsumeRefreshToken(req.RefreshToken)
	if err != nil {
		if errors.Is(err, store.ErrInvalidRefreshToken) {
			resp.OAuthError(http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
			return
		}
		resp.APIError(http.StatusInternalServerError, err.Error())
		return
	}

	tr, err := h.tokens.Build(u, newRT.SessionID, newRT.Token)
	if err != nil {
		resp.APIError(http.StatusInternalServerError, err.Error())
		return
	}
	resp.JSON(http.StatusOK, tr)
}
