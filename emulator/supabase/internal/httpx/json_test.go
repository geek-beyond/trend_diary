package httpx

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteJSON(t *testing.T) {
	t.Run("Content-Typeとstatusが設定される", func(t *testing.T) {
		w := httptest.NewRecorder()
		WriteJSON(w, 201, map[string]string{"hello": "world"})
		if got := w.Header().Get("Content-Type"); got != "application/json" {
			t.Errorf("Content-Type: got=%s", got)
		}
		if w.Code != 201 {
			t.Errorf("status: got=%d", w.Code)
		}
		if !strings.Contains(w.Body.String(), `"hello":"world"`) {
			t.Errorf("body: %s", w.Body.String())
		}
	})

	t.Run("body=nilでも本文を書かない", func(t *testing.T) {
		w := httptest.NewRecorder()
		WriteJSON(w, 204, nil)
		if w.Body.Len() != 0 {
			t.Errorf("body should be empty, got=%q", w.Body.String())
		}
	})
}
