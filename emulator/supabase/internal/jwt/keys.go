package jwt

// DefaultSecret は Supabase CLI のローカル demo と同じ固定 HS256 秘密鍵。
// 既存の .dev.vars.example / supabase/config.toml と整合させるため、絶対に変更しないこと。
const DefaultSecret = "super-secret-jwt-token-with-at-least-32-characters-long"

// AnonKey は role=anon の固定 JWT。
// Supabase CLI が `supabase start` 時に出力するものと同一。
// exp は 2032-05-17（十分先）に固定されている。
const AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

// ServiceRoleKey は role=service_role の固定 JWT。
const ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
