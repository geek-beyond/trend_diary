-- Migrate PK/FK id columns to SQLite INTEGER AUTOINCREMENT-compatible definitions.
-- Keep existing ids/data and move to DB-driven id generation for new rows.

PRAGMA foreign_keys=OFF;

CREATE TABLE "users_new" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "users_new" ("user_id", "created_at")
SELECT "user_id", "created_at"
FROM "users";

CREATE TABLE "articles_new" (
    "article_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "media" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "articles_new" ("article_id", "media", "title", "author", "description", "url", "created_at")
SELECT "article_id", "media", "title", "author", "description", "url", "created_at"
FROM "articles";

CREATE TABLE "active_users_new" (
    "active_user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "authentication_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" INTEGER NOT NULL,
    CONSTRAINT "active_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_new" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "active_users_new" (
    "active_user_id",
    "email",
    "display_name",
    "authentication_id",
    "created_at",
    "updated_at",
    "user_id"
)
SELECT
    "active_user_id",
    "email",
    "display_name",
    "authentication_id",
    "created_at",
    "updated_at",
    "user_id"
FROM "active_users";

CREATE TABLE "read_histories_new" (
    "read_history_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "read_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "article_id" INTEGER NOT NULL,
    "active_user_id" INTEGER NOT NULL,
    CONSTRAINT "read_histories_active_user_id_fkey" FOREIGN KEY ("active_user_id") REFERENCES "active_users_new" ("active_user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "read_histories_new" (
    "read_history_id",
    "read_at",
    "created_at",
    "article_id",
    "active_user_id"
)
SELECT
    "read_history_id",
    "read_at",
    "created_at",
    "article_id",
    "active_user_id"
FROM "read_histories";

CREATE TABLE "banned_users_new" (
    "user_id" INTEGER NOT NULL,
    "banned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "banned_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_new" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "banned_users_new" ("user_id", "banned_at", "reason", "created_at")
SELECT "user_id", "banned_at", "reason", "created_at"
FROM "banned_users";

CREATE TABLE "leaved_users_new" (
    "user_id" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leaved_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_new" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "leaved_users_new" ("user_id", "reason", "created_at")
SELECT "user_id", "reason", "created_at"
FROM "leaved_users";

DROP TABLE "read_histories";
DROP TABLE "active_users";
DROP TABLE "banned_users";
DROP TABLE "leaved_users";
DROP TABLE "articles";
DROP TABLE "users";

ALTER TABLE "users_new" RENAME TO "users";
ALTER TABLE "articles_new" RENAME TO "articles";
ALTER TABLE "active_users_new" RENAME TO "active_users";
ALTER TABLE "read_histories_new" RENAME TO "read_histories";
ALTER TABLE "banned_users_new" RENAME TO "banned_users";
ALTER TABLE "leaved_users_new" RENAME TO "leaved_users";

CREATE UNIQUE INDEX "active_users_email_key" ON "active_users"("email");
CREATE UNIQUE INDEX "active_users_authentication_id_key" ON "active_users"("authentication_id");
CREATE UNIQUE INDEX "active_users_user_id_key" ON "active_users"("user_id");
CREATE UNIQUE INDEX "articles_url_key" ON "articles"("url");
CREATE UNIQUE INDEX "banned_users_user_id_key" ON "banned_users"("user_id");
CREATE UNIQUE INDEX "leaved_users_user_id_key" ON "leaved_users"("user_id");
CREATE INDEX "idx_read_histories_article_user" ON "read_histories"("article_id", "active_user_id");

PRAGMA foreign_keys=ON;
