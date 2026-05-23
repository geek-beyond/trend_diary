package jwt

import (
	"errors"
	"strings"
	"testing"
	"time"

	jwtv5 "github.com/golang-jwt/jwt/v5"
)

const testSecret = "super-secret-jwt-token-with-at-least-32-characters-long"

func TestSign(t *testing.T) {
	t.Run("HS256で3パートのJWT文字列を生成する", func(t *testing.T) {
		claims := Claims{
			Subject: "user-1",
			Issuer:  "http://127.0.0.1:54321/auth/v1",
			Audience: "authenticated",
			Role:     "authenticated",
			IssuedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC).Unix(),
			Expiry:   time.Date(2026, 1, 1, 1, 0, 0, 0, time.UTC).Unix(),
		}
		token, err := Sign(claims, testSecret)
		if err != nil {
			t.Fatalf("Sign returned error: %v", err)
		}
		parts := strings.Split(token, ".")
		if len(parts) != 3 {
			t.Fatalf("expected 3 parts, got %d (token=%q)", len(parts), token)
		}
		for i, p := range parts {
			if p == "" {
				t.Fatalf("part %d is empty", i)
			}
		}
	})
}

func TestVerify(t *testing.T) {
	baseClaims := Claims{
		Subject:  "user-1",
		Issuer:   "http://127.0.0.1:54321/auth/v1",
		Audience: "authenticated",
		Role:     "authenticated",
		IssuedAt: time.Now().Unix(),
		Expiry:   time.Now().Add(time.Hour).Unix(),
	}

	t.Run("正しい署名のトークンを検証してClaimsを返す", func(t *testing.T) {
		token, err := Sign(baseClaims, testSecret)
		if err != nil {
			t.Fatalf("Sign: %v", err)
		}
		got, err := Verify(token, testSecret)
		if err != nil {
			t.Fatalf("Verify: %v", err)
		}
		if got.Subject != baseClaims.Subject {
			t.Errorf("Subject mismatch: got=%s want=%s", got.Subject, baseClaims.Subject)
		}
		if got.Role != "authenticated" {
			t.Errorf("Role mismatch: got=%s", got.Role)
		}
	})

	t.Run("改ざんされたトークンをErrInvalidSignatureで拒否する", func(t *testing.T) {
		token, _ := Sign(baseClaims, testSecret)
		// 末尾を1文字書き換える
		tampered := token[:len(token)-2] + "AA"
		_, err := Verify(tampered, testSecret)
		if !errors.Is(err, ErrInvalidSignature) {
			t.Fatalf("expected ErrInvalidSignature, got %v", err)
		}
	})

	t.Run("expを過ぎたトークンをErrExpiredで拒否する", func(t *testing.T) {
		expired := baseClaims
		expired.Expiry = time.Now().Add(-time.Minute).Unix()
		token, _ := Sign(expired, testSecret)
		_, err := Verify(token, testSecret)
		if !errors.Is(err, ErrExpired) {
			t.Fatalf("expected ErrExpired, got %v", err)
		}
	})

	t.Run("不正な秘密鍵で署名されたトークンを拒否する", func(t *testing.T) {
		token, _ := Sign(baseClaims, "different-secret-different-secret-different-secret")
		_, err := Verify(token, testSecret)
		if !errors.Is(err, ErrInvalidSignature) {
			t.Fatalf("expected ErrInvalidSignature, got %v", err)
		}
	})

	t.Run("3パート未満のトークンを拒否する", func(t *testing.T) {
		_, err := Verify("not.a.valid.token.x", testSecret)
		if err == nil {
			t.Fatalf("expected error")
		}
		_, err = Verify("only-one", testSecret)
		if err == nil {
			t.Fatalf("expected error")
		}
	})
}

// golang-jwt/jwt/v5 で生成したトークンも検証できる（互換性ゴールデン）。
func TestVerify_CompatibleWithGolangJWT(t *testing.T) {
	t.Run("golang-jwt/jwt/v5で生成したHS256トークンを検証できる", func(t *testing.T) {
		now := time.Now()
		tok := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, jwtv5.MapClaims{
			"sub":  "user-2",
			"iss":  "http://127.0.0.1:54321/auth/v1",
			"aud":  "authenticated",
			"role": "authenticated",
			"iat":  now.Unix(),
			"exp":  now.Add(time.Hour).Unix(),
		})
		signed, err := tok.SignedString([]byte(testSecret))
		if err != nil {
			t.Fatalf("SignedString: %v", err)
		}
		got, err := Verify(signed, testSecret)
		if err != nil {
			t.Fatalf("Verify: %v", err)
		}
		if got.Subject != "user-2" {
			t.Errorf("Subject mismatch: %s", got.Subject)
		}
	})

	t.Run("自前Signのトークンをgolang-jwt/jwt/v5で検証できる", func(t *testing.T) {
		c := Claims{
			Subject:  "user-3",
			Issuer:   "http://127.0.0.1:54321/auth/v1",
			Audience: "authenticated",
			Role:     "authenticated",
			IssuedAt: time.Now().Unix(),
			Expiry:   time.Now().Add(time.Hour).Unix(),
		}
		signed, err := Sign(c, testSecret)
		if err != nil {
			t.Fatalf("Sign: %v", err)
		}
		parsed, err := jwtv5.Parse(signed, func(t *jwtv5.Token) (any, error) {
			return []byte(testSecret), nil
		})
		if err != nil {
			t.Fatalf("jwtv5.Parse: %v", err)
		}
		claims, ok := parsed.Claims.(jwtv5.MapClaims)
		if !ok {
			t.Fatalf("claims type assertion failed")
		}
		if claims["sub"] != "user-3" {
			t.Errorf("sub mismatch: %v", claims["sub"])
		}
	})
}
