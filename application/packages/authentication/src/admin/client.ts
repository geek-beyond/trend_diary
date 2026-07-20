import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface AuthAdminConfig {
  url: string
  serviceRoleKey: string
}

export interface AuthUserSummary {
  id: string
  email: string | null
}

// service_role 権限を要する認証ユーザーの後始末はテスト専用。
// 本番で誤用すると service_role 権限を露出させる契約違反になりうるため、テスト環境以外での生成を実行時に禁じる。
export class AuthAdminClient {
  private readonly client: SupabaseClient

  constructor(config: AuthAdminConfig) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('AuthAdminClient はテスト専用であり、テスト環境以外では生成できません')
    }
    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  // テストで作られるユーザー数は十分小さいため1ページで足りる
  async listUsers(): Promise<AuthUserSummary[]> {
    const { data, error } = await this.client.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return []
    return data.users.map((user) => ({ id: user.id, email: user.email ?? null }))
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.auth.admin.deleteUser(id)
  }
}
