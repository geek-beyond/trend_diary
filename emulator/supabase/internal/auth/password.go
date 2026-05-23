package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword は bcrypt でパスワードをハッシュ化する。コスト最小に近い値でテスト速度を確保。
func HashPassword(pw string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(pw), bcrypt.MinCost)
}

// VerifyPassword は bcrypt ハッシュとの一致を返す。
func VerifyPassword(hash []byte, pw string) bool {
	return bcrypt.CompareHashAndPassword(hash, []byte(pw)) == nil
}
