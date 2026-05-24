package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type Logout struct {
	store  *store.Store
	tokens *Tokens
}

func NewLogout(st *store.Store, tk *Tokens) *Logout {
	return &Logout{store: st, tokens: tk}
}

func (h *Logout) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	resp := httpx.MustFromContext(r.Context())

	// GoTrue は logout を冪等として扱い、Bearer 無し/期限切れでも 204 を返す。
	// access_token が exp 切れでも session を revoke すべきなので、署名のみ検証してから
	// claims を取り出す（exp 検証を絡めると expired token で revoke が走らず、
	// 同 session の refresh_token がそのまま使えてしまうため）。
	if token := authBearer(r); token != "" {
		if err := h.tokens.VerifySignature(token); err == nil {
			if claims, err := h.tokens.DecodeUnverified(token); err == nil && claims.SessionID != "" {
				h.store.RevokeRefreshTokensBySession(claims.SessionID)
			}
		}
	}
	resp.NoContent()
}
