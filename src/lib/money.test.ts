import assert from "node:assert/strict";
import test from "node:test";
import { multiplyMoney, sumMoney, toMinorUnits } from "./money";

test("money calculations use integer minor units", () => {
  assert.equal(toMinorUnits(10.005), 1001);
  assert.equal(multiplyMoney(19.99, 3), 59.97);
  assert.equal(sumMoney([0.1, 0.2]), 0.3);
});
