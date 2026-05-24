package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
)

type Reset struct {
	store *store.Store
}

func NewReset(st *store.Store) *Reset { return &Reset{store: st} }

func (h *Reset) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	h.store.Reset()
	w.WriteHeader(http.StatusNoContent)
}
