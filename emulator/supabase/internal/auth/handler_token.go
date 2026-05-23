package auth

import (
	"errors"
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/jwt"
)

// tokenResponse は GoTrue の AccessTokenResponse。
// supabase-js は session オブジェクトとしてこれを保持する。
type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	ExpiresAt    int64  `json:"expires_at"`
	RefreshToken string `json:"refresh_token"`
	User         *User  `json:"user"`
}

type passwordGrantRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone,omitempty"`
}

type refreshGrantRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (s *Service) handleToken(w http.ResponseWriter, r *http.Request) {
	grant := r.URL.Query().Get("grant_type")
	switch grant {
	case "password":
		s.handleTokenPassword(w, r)
	case "refresh_token":
		s.handleTokenRefresh(w, r)
	default:
		writeOAuthError(w, http.StatusBadRequest, "unsupported_grant_type", "grant_type is required")
	}
}

func (s *Service) handleTokenPassword(w http.ResponseWriter, r *http.Request) {
	var req passwordGrantRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	u, ok := s.store.FindUserByEmail(req.Email)
	if !ok {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}
	if !VerifyPassword(u.PasswordHash, req.Password) {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid login credentials")
		return
	}

	s.store.UpdateLastSignIn(u.ID)
	// 最新のユーザ情報を取得
	u, _ = s.store.FindUserByID(u.ID)

	resp, err := s.issueSession(u)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, resp)
}

func (s *Service) handleTokenRefresh(w http.ResponseWriter, r *http.Request) {
	var req refreshGrantRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	if req.RefreshToken == "" {
		writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
		return
	}

	newRT, u, err := s.store.ConsumeRefreshToken(req.RefreshToken)
	if err != nil {
		if errors.Is(err, ErrInvalidRefreshToken) {
			writeOAuthError(w, http.StatusBadRequest, "invalid_grant", "Invalid Refresh Token")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp, err := s.issueAccessTokenForRefresh(u, newRT)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, resp)
}

// issueSession は新しい session + access_token + refresh_token を発行する。
func (s *Service) issueSession(u *User) (*tokenResponse, error) {
	sess, err := s.store.CreateSession(u.ID)
	if err != nil {
		return nil, err
	}
	rt, err := s.store.IssueRefreshToken(u.ID, sess.ID)
	if err != nil {
		return nil, err
	}
	return s.buildTokenResponse(u, sess.ID, rt.Token)
}

// issueAccessTokenForRefresh は rotation 後の新refresh_token に対して access_token を発行する。
func (s *Service) issueAccessTokenForRefresh(u *User, rt *RefreshToken) (*tokenResponse, error) {
	return s.buildTokenResponse(u, rt.SessionID, rt.Token)
}

func (s *Service) buildTokenResponse(u *User, sessionID, refreshToken string) (*tokenResponse, error) {
	now := s.clock()
	exp := now.Add(s.cfg.AccessTokenTTL)
	claims := jwt.Claims{
		Subject:      u.ID,
		Issuer:       s.cfg.JWTIssuer,
		Audience:     u.Aud,
		Role:         u.Role,
		Email:        u.Email,
		IssuedAt:     now.Unix(),
		Expiry:       exp.Unix(),
		SessionID:    sessionID,
		AppMetadata:  u.AppMetadata,
		UserMetadata: u.UserMetadata,
	}
	token, err := jwt.Sign(claims, s.cfg.JWTSecret)
	if err != nil {
		return nil, err
	}
	return &tokenResponse{
		AccessToken:  token,
		TokenType:    "bearer",
		ExpiresIn:    int64(s.cfg.AccessTokenTTL.Seconds()),
		ExpiresAt:    exp.Unix(),
		RefreshToken: refreshToken,
		User:         u,
	}, nil
}
