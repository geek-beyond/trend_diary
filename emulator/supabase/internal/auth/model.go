package auth

import "time"

// User はGoTrue互換のユーザー表現。レスポンス時のJSONフィールド名は GoTrue と一致させる。
type User struct {
	ID               string         `json:"id"`
	Email            string         `json:"email"`
	Aud              string         `json:"aud"`
	Role             string         `json:"role"`
	EmailConfirmedAt *time.Time     `json:"email_confirmed_at,omitempty"`
	Phone            string         `json:"phone,omitempty"`
	ConfirmedAt      *time.Time     `json:"confirmed_at,omitempty"`
	LastSignInAt     *time.Time     `json:"last_sign_in_at,omitempty"`
	AppMetadata      map[string]any `json:"app_metadata"`
	UserMetadata     map[string]any `json:"user_metadata"`
	Identities       []Identity     `json:"identities"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`

	// 内部用（JSONには出さない）
	PasswordHash []byte `json:"-"`
}

// Identity は GoTrue が user に紐づける identity 表現。
// password ログインだけサポートする本エミュレータでは provider="email" 固定で1個だけ作る。
type Identity struct {
	ID           string         `json:"id"`
	UserID       string         `json:"user_id"`
	Provider     string         `json:"provider"`
	IdentityData map[string]any `json:"identity_data"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	LastSignInAt time.Time      `json:"last_sign_in_at"`
}

// RefreshToken はrefresh_token 1本を表す。rotation時に旧トークンを失効させる。
type RefreshToken struct {
	Token     string
	UserID    string
	SessionID string
	IssuedAt  time.Time
	Revoked   bool
	// Parent は rotation チェーン上の親トークン。reuse_interval 内なら再利用可。
	Parent string
}

// Session は user に紐づくセッション。logout や admin.deleteUser で関連 refresh_token と共に消す。
type Session struct {
	ID        string
	UserID    string
	CreatedAt time.Time
}
