import assert from "node:assert/strict";
import test from "node:test";
import { parseScheduledDate } from "./timezone";

test("CMS local schedule is converted from configured Baku time to UTC", () => {
  assert.equal(
    parseScheduledDate("2026-08-08T14:00", "Asia/Baku")?.toISOString(),
    "2026-08-08T10:00:00.000Z",
  );
});

test("CMS ISO schedule with offset is preserved", () => {
  assert.equal(
    parseScheduledDate("2026-08-08T14:00:00+04:00")?.toISOString(),
    "2026-08-08T10:00:00.000Z",
  );
});
