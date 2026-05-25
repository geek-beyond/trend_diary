package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/geek-beyond/trend-diary/emulator/supabase/internal/auth/store"
)

type signupRequest struct {
	Email    string         `json:"email"`
	Password string         `json:"password"`
	Data     map[string]any `json:"data"`
}

func Signup(h *Handler) {
	var req signupRequest
	if err := h.ReadJSON(&req); err != nil {
		h.Error(http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		h.Error(http.StatusBadRequest, "email and password are required")
		return
	}
	if !strings.Contains(req.Email, "@") {
		h.Error(http.StatusBadRequest, "Unable to validate email address: invalid format")
		return
	}
	// GoTrue デフォルト password_min_length=6 と合わせる。アプリ層 Zod は min=8 を要求するため
	// エミュレータ直叩きしない限り 6-7 文字はアプリ側で先に弾かれる。
	if len(req.Password) < 6 {
		h.Error(http.StatusUnprocessableEntity, "Password should be at least 6 characters")
		return
	}

	hash, err := store.HashPassword(req.Password)
	if err != nil {
		h.Error(http.StatusInternalServerError, "failed to hash password")
		return
	}

	u, err := h.store.CreateUser(req.Email, hash)
	if err != nil {
		if errors.Is(err, store.ErrUserAlreadyExists) {
			// アプリ側 isUserAlreadyExistsError は "already registered" 包含判定なので変更不可
			h.Error(http.StatusUnprocessableEntity, "User already registered")
			return
		}
		h.Error(http.StatusInternalServerError, err.Error())
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
	session, err := h.tokens.Issue(u)
	if err != nil {
		h.Error(http.StatusInternalServerError, err.Error())
		return
	}
	h.JSON(http.StatusOK, session)
}
