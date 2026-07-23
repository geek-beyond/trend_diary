-- CreateTable
CREATE TABLE "active_users" (
    "active_user_id" BIGINT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "authentication_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" BIGINT NOT NULL,
    CONSTRAINT "active_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "articles" (
    "article_id" BIGINT NOT NULL PRIMARY KEY,
    "media" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "banned_users" (
    "user_id" BIGINT NOT NULL,
    "banned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "banned_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leaved_users" (
    "user_id" BIGINT NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leaved_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "read_histories" (
    "read_history_id" BIGINT NOT NULL PRIMARY KEY,
    "read_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "article_id" BIGINT NOT NULL,
    "active_user_id" BIGINT NOT NULL,
    CONSTRAINT "read_histories_active_user_id_fkey" FOREIGN KEY ("active_user_id") REFERENCES "active_users" ("active_user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" BIGINT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "active_users_email_key" ON "active_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "active_users_authentication_id_key" ON "active_users"("authentication_id");

-- CreateIndex
CREATE UNIQUE INDEX "active_users_user_id_key" ON "active_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_url_key" ON "articles"("url");

-- CreateIndex
CREATE UNIQUE INDEX "banned_users_user_id_key" ON "banned_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaved_users_user_id_key" ON "leaved_users"("user_id");

-- CreateIndex
CREATE INDEX "idx_read_histories_article_user" ON "read_histories"("article_id", "active_user_id");
