package handler

import (
	"net/http"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/store"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/httpx"
)

type Snapshot struct {
	store *store.Store
}

func NewSnapshot(st *store.Store) *Snapshot { return &Snapshot{store: st} }

func (h *Snapshot) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, h.store.Snapshot())
}
