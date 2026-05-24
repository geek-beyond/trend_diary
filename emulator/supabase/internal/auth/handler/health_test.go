package handler_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler/handlertest"
)

func TestHealth(t *testing.T) {
	t.Run("200 + name=GoTrue", func(t *testing.T) {
		st := handlertest.NewStore(nil)
		f := handlertest.NewFactory(st, handlertest.NewTokens(st, nil))

		rec := httptest.NewRecorder()
		handlertest.Serve(f, handler.Health, rec, handlertest.NewRequest(t, http.MethodGet, "/auth/v1/health", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status: %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), `"name":"GoTrue"`) {
			t.Errorf("body: %s", rec.Body.String())
		}
	})
}
