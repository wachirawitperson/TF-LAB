import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migrationUrl = new URL("../supabase/migrations/20260924000000_create_portal.sql", import.meta.url)

test("Supabase migration enables RLS and limits writes to the single admin", async () => {
  const sql = await readFile(migrationUrl, "utf8")
  assert.match(sql, /alter table public\.categories enable row level security/i)
  assert.match(sql, /alter table public\.tools enable row level security/i)
  assert.match(sql, /private\.is_admin\(\)/i)
  assert.match(sql, /with check \(\(select private\.is_admin\(\)\)\)/i)
  assert.doesNotMatch(sql, /user_metadata/i)
  assert.doesNotMatch(sql, /service_role/i)
})

test("cover storage supports secure admin upsert and delete", async () => {
  const sql = await readFile(migrationUrl, "utf8")
  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(sql, new RegExp(`on storage\\.objects for ${operation}`, "i"))
  }
})
