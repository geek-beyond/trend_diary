package uuidx

import (
	"regexp"
	"testing"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

func TestNew(t *testing.T) {
	t.Run("36文字のRFC4122準拠UUID形式を返す", func(t *testing.T) {
		got := New()
		if len(got) != 36 {
			t.Fatalf("length: got=%d want=36 (uuid=%q)", len(got), got)
		}
		if !uuidPattern.MatchString(got) {
			t.Fatalf("does not match UUID v4 pattern: %q", got)
		}
	})

	t.Run("バージョン4ビットが4である", func(t *testing.T) {
		got := New()
		// 14文字目（index 14）が "4"
		if got[14] != '4' {
			t.Fatalf("version digit must be 4: got=%c (uuid=%q)", got[14], got)
		}
	})

	t.Run("variantビットが8/9/a/bのいずれかである", func(t *testing.T) {
		got := New()
		c := got[19]
		switch c {
		case '8', '9', 'a', 'b':
		default:
			t.Fatalf("variant digit must be 8/9/a/b: got=%c (uuid=%q)", c, got)
		}
	})

	t.Run("1万回呼んで重複しない", func(t *testing.T) {
		seen := make(map[string]struct{}, 10000)
		for i := 0; i < 10000; i++ {
			id := New()
			if _, dup := seen[id]; dup {
				t.Fatalf("duplicate at i=%d: %s", i, id)
			}
			seen[id] = struct{}{}
		}
	})
}
