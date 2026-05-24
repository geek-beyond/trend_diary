package handler_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler"
	"github.com/geek-teck-mentors/trend-diary/emulator/supabase/internal/auth/handler/handlertest"
)

func TestAdminDeleteUser(t *testing.T) {
	t.Run("有効なIDで200を返す", func(t *testing.T) {
		st := handlertest.NewStore(nil)
		tk := handlertest.NewTokens(st, nil)
		seeded := handlertest.Seed(t, st, tk, "alice@example.com", "password123")
		h := handler.NewAdminDeleteUser(st)

		req := handlertest.NewRequest(t, http.MethodDelete, "/auth/v1/admin/users/"+seeded.User.ID, nil)
		req.SetPathValue("id", seeded.User.ID)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status: %d", rec.Code)
		}
		if _, ok := st.FindUserByID(seeded.User.ID); ok {
			t.Error("user still exists after delete")
		}
	})

	t.Run("ID 解決失敗系", func(t *testing.T) {
		cases := []struct {
			name       string
			id         string
			wantStatus int
		}{
			{name: "存在しないID", id: "nonexistent", wantStatus: http.StatusNotFound},
			{name: "空ID", id: "", wantStatus: http.StatusBadRequest},
		}
		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				st := handlertest.NewStore(nil)
				h := handler.NewAdminDeleteUser(st)

				req := handlertest.NewRequest(t, http.MethodDelete, "/auth/v1/admin/users/"+c.id, nil)
				req.SetPathValue("id", c.id)
				rec := httptest.NewRecorder()
				h.ServeHTTP(rec, req)
				if rec.Code != c.wantStatus {
					t.Fatalf("status: got=%d want=%d", rec.Code, c.wantStatus)
				}
			})
		}
	})
}
