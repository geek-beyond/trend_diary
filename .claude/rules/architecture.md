---
paths:
  - "**/src/**/*.{ts,tsx}"
---

# アーキテクチャ規約

- utilsの作成は禁止
  - 理由: 責任の所在が不明確になり、アーキテクチャ層の境界が曖昧になる。DDDの原則を遵守し、貧血性ドメインを防ぐため
  - 代替案:
    - 共通ロジックは`src/common/`配下の明確な目的を持ったディレクトリに配置
    - ドメイン固有のロジックは各集約内に配置
- client配下（`packages/web/src/client/`）からドメインのユースケースファクトリ（`create*UseCase`）を直接生成しない
  - 理由: Hono API層のミドルウェア（レート制限・CSRF等）をバイパスしてしまうため
  - 代替案: Hono API経由で呼び出す。ドメインパッケージからのimportは型・定数・スキーマのみ許可
  - 備考: `application/biome-plugins/no-domain-use-case-in-client.grit`（Biomeプラグイン）で機械的に検出される
