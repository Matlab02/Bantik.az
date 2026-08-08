import assert from "node:assert/strict";
import test from "node:test";
import { safeAssetUrl, safeInternalPath } from "./http-security";
import { MemoryRateLimitStore } from "./rate-limit";

test("rate limiter blocks requests over the configured window", () => {
  const store = new MemoryRateLimitStore();
  assert.equal(store.consume("login:1", { limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(store.consume("login:1", { limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(store.consume("login:1", { limit: 2, windowMs: 60_000 }).allowed, false);
});

test("redirects and CMS image URLs reject unsafe schemes", () => {
  assert.equal(safeInternalPath("//evil.example"), "/");
  assert.equal(safeInternalPath("https://evil.example"), "/");
  assert.equal(safeInternalPath("/products"), "/products");
  assert.equal(safeAssetUrl("/products/example.png"), "/products/example.png");
  assert.throws(() => safeAssetUrl("http://evil.example/image.png"));
  assert.throws(() => safeAssetUrl("javascript:alert(1)"));
});
