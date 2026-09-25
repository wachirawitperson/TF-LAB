import assert from "node:assert/strict"
import test from "node:test"

import {
  isSafeHttpUrl,
  recentlyUsed,
  removeCategory,
  seedData,
  upsertTool,
} from "../lib/portal.ts"

test("accepts only http and https tool links", () => {
  assert.equal(isSafeHttpUrl("https://example.com/tool"), true)
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false)
  assert.equal(isSafeHttpUrl("not-a-url"), false)
})

test("upsert replaces an existing tool without duplicating it", () => {
  const original = seedData.tools[0]
  const result = upsertTool(seedData.tools, { ...original, name: "New name" })
  assert.equal(result.length, seedData.tools.length)
  assert.equal(result.find((tool) => tool.id === original.id)?.name, "New name")
})

test("category deletion is blocked while tools still use it", () => {
  const result = removeCategory(seedData, "docs")
  assert.equal(result.ok, false)
  assert.equal(result.reason, "category_in_use")
})

test("recently used tools are newest first", () => {
  const result = recentlyUsed(seedData.tools)
  assert.deepEqual(
    result.map((tool) => tool.id),
    ["document-studio", "focus-timer", "admin-console"],
  )
})
