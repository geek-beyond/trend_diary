DROP TRIGGER IF EXISTS "active_users_set_updated_at";

CREATE TRIGGER "active_users_set_updated_at"
AFTER UPDATE ON "active_users"
FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "active_users"
  SET "updated_at" = CURRENT_TIMESTAMP
  WHERE "active_user_id" = OLD."active_user_id";
END;
