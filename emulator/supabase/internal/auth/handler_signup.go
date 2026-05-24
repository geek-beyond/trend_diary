package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type signupRequest struct {
	Email    string         `json:"email"`
	Password string         `json:"password"`
	Data     map[string]any `json:"data"`
}

func (s *Service) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		writeAPIError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if !strings.Contains(req.Email, "@") {
		writeAPIError(w, http.StatusBadRequest, "Unable to validate email address: invalid format")
		return
	}
	// GoTrue デフォルトの password_min_length=6 と合わせる。アプリ層の Zod は
	// より厳しい min=8 を要求するため、エミュレータを HTTP 直叩きしない限り 6-7 文字は
	// アプリ側で先に弾かれる。GoTrue 互換性を優先してここでは緩めにしている。
	if len(req.Password) < 6 {
		writeAPIError(w, http.StatusUnprocessableEntity, "Password should be at least 6 characters")
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	u, err := s.store.CreateUser(req.Email, hash)
	if err != nil {
		if errors.Is(err, ErrUserAlreadyExists) {
			// 既存実装 isUserAlreadyExistsError は "already registered" を含むかで判定する
			writeAPIError(w, http.StatusUnprocessableEntity, "User already registered")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(req.Data) > 0 {
		s.store.SetUserMetadata(u.ID, req.Data)
		// 直後の issueSession に同じ metadata が反映されるよう clone を取り直す
		if fresh, ok := s.store.FindUserByID(u.ID); ok {
			u = fresh
		}
	}

	// mailer_autoconfirm=true 想定。GoTrue は AccessTokenResponse をそのまま返す。
	// supabase-js はこの形式を見て {data:{user, session}} に再構成する。
	session, err := s.issueSession(u)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session)
}
