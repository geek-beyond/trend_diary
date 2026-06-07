CREATE TABLE "skipped_articles" (
    "skipped_article_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "article_id" INTEGER NOT NULL,
    "active_user_id" INTEGER NOT NULL,
    CONSTRAINT "skipped_articles_active_user_id_fkey" FOREIGN KEY ("active_user_id") REFERENCES "active_users" ("active_user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_skipped_articles_article_user" ON "skipped_articles"("article_id", "active_user_id");
CREATE INDEX "idx_skipped_articles_article_user" ON "skipped_articles"("article_id", "active_user_id");
