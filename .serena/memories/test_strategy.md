# テスト戦略

## 多層テスト構造

このプロジェクトでは、アーキテクチャ層ごとに異なる設定のVitestを使用した多層テスト戦略を採用している。

### 1. ドメイン層テスト (`test:domain`)

**設定ファイル**: `src/test/vitest/domain/config.ts`

**特徴**:
- モックPrismaクライアントを使用（`src/test/__mocks__/prisma.ts`）
- データベースに接続せず高速に実行
- ビジネスロジックの単体テスト
- `vitest-mock-extended`によるモック拡張

**対象**:
- `src/domain/*/use-case.ts`
- `src/domain/*/use-case.test.ts`

**実行コマンド**:
```bash
pnpm run test:domain
```

**用途**:
- ドメインロジックの検証
- エラーハンドリングの確認
- ビジネスルールの検証

---

### 2. API層テスト (`test:api`)

**設定ファイル**: `src/test/vitest/server/config.ts`

**特徴**:
- **実際のデータベース**を使用した統合テスト
- Honoアプリケーションのエンドポイントテスト
- リクエスト/レスポンスの検証

**対象**:
- `src/web/server/`配下のAPIエンドポイント

**実行コマンド**:
```bash
pnpm run test:api
```

**用途**:
- APIエンドポイントの統合テスト
- リクエストバリデーションの確認
- データベースとの連携確認
- 認証・認可の動作確認

---

### 3. フロントエンド層テスト (`test:client`)

**設定ファイル**: `src/test/vitest/client/config.ts`

**特徴**:
- React Testing Libraryを使用
- コンポーネントとReact Hooksのテスト
- jsdom環境で実行

**対象**:
- `src/web/client/`配下のReactコンポーネント
- カスタムReact Hooks

**実行コマンド**:
```bash
pnpm run test:client
```

**用途**:
- UIコンポーネントの動作確認
- ユーザーインタラクションのテスト
- カスタムフックのロジック検証

---

### 4. Storybookテスト (`test-storybook`)

**設定ファイル**: `src/test/vitest/storybook/config.ts`

**特徴**:
- UIコンポーネントのビジュアルテスト
- Storybook統合
- `@storybook/addon-vitest`を使用

**対象**:
- `.storybook/`配下のStorybookストーリー

**実行コマンド**:
```bash
pnpm run test-storybook
```

**用途**:
- UIコンポーネントのビジュアルリグレッションテスト
- 各種状態でのコンポーネント表示確認
- アクセシビリティテスト

---

### 5. E2Eテスト (`e2e`)

**設定ファイル**: `playwright.config.ts`

**特徴**:
- Playwrightを使用
- エンドツーエンドシナリオのテスト
- ブラウザ自動化

**対象**:
- `src/test/e2e/`配下のE2Eテストシナリオ

**実行コマンド**:
```bash
pnpm run e2e           # E2E実行
pnpm run e2e:report    # レポート表示
pnpm run e2e:gen       # テストコード生成
```

**用途**:
- ユーザーシナリオのエンドツーエンド検証
- クリティカルパスの動作確認
- ブラウザ間の互換性確認

---

## テスト実行のベストプラクティス

### 開発時
- 変更した層のテストを実行
- 例: ドメイン層変更時は `pnpm run test:domain`

### リファクタリング時
- 影響範囲に応じて複数層のテストを実行
- 全テスト実行を推奨

### PR作成前
- 全てのテスト層を実行
- E2Eテストも含めて実行

### CI/CD
- 全テスト層が自動実行される
- テスト失敗時はマージブロック

## テストカバレッジ

カバレッジ計測:
```bash
# カバレッジ付きでテスト実行
vitest run --coverage
```

カバレッジツール: `@vitest/coverage-v8`

## テストヘルパー

**場所**: `src/test/helper/`

- データベースセットアップヘルパー
- フィクスチャ生成ヘルパー（`@faker-js/faker`使用）
- テスト用モックデータ

## テスト環境変数

**場所**: `src/test/env.ts`

テスト専用の環境変数を定義。
