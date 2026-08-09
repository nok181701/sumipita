-- お気に入り機能用。0002_auth.sql と同様、DROP TABLEを含めないこと
-- （load-data.ymlのスコア更新のたびにユーザーデータが消えるため）。
-- towns(key) への外部キーは張らない — towns は0001_init.sqlでDROP/再作成される対象。
-- （0002_auth.sqlもusers.idへのFKを張っていない。それに合わせる）

CREATE TABLE IF NOT EXISTS "favorites" (
  "user_id" text NOT NULL,
  "town_key" text NOT NULL,
  "created_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "town_key")
);

CREATE INDEX IF NOT EXISTS "favorites_user_id_idx" ON "favorites" ("user_id");
