export function toMinorUnits(value: number) {
  if (!Number.isFinite(value)) throw new Error("INVALID_MONEY");
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromMinorUnits(value: number) {
  if (!Number.isSafeInteger(value)) throw new Error("INVALID_MONEY");
  return value / 100;
}

export function multiplyMoney(unitPrice: number, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error("INVALID_QUANTITY");
  }
  return fromMinorUnits(toMinorUnits(unitPrice) * quantity);
}

export function sumMoney(values: number[]) {
  return fromMinorUnits(values.reduce((sum, value) => sum + toMinorUnits(value), 0));
}
