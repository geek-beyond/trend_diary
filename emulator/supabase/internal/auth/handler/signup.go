package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type signupRequest struct {
	Email    string         `json:"email"`
	Password string         `json:"password"`
	Data     map[string]any `json:"data"`
}

func (h *Handler) handleSignup(w http.ResponseWriter, r *http.Request) {
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
	// GoTrue デフォルト password_min_length=6 と合わせる。アプリ層 Zod は min=8 を要求するので
	// エミュレータ直叩きしない限り 6-7 文字はアプリ側で先に弾かれる。
	if len(req.Password) < 6 {
		writeAPIError(w, http.StatusUnprocessableEntity, "Password should be at least 6 characters")
		return
	}

	hash, err := store.HashPassword(req.Password)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	u, err := h.store.CreateUser(req.Email, hash)
	if err != nil {
		if errors.Is(err, store.ErrUserAlreadyExists) {
			// アプリ側 isUserAlreadyExistsError は "already registered" 包含判定なので変更不可
			writeAPIError(w, http.StatusUnprocessableEntity, "User already registered")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(req.Data) > 0 {
		h.store.SetUserMetadata(u.ID, req.Data)
		if fresh, ok := h.store.FindUserByID(u.ID); ok {
			u = fresh
		}
	}

	// mailer_autoconfirm=true 想定。GoTrue は AccessTokenResponse をそのまま返し、
	// supabase-js が {data:{user, session}} に再構成する。
	session, err := h.issueSession(u)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session)
}
