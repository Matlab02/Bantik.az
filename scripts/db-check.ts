import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const [badInventory, badOrders, badItems, badTransfers, duplicateSku, duplicateBarcode, badCms] =
    await Promise.all([
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "Inventory"
        WHERE "quantity" < 0 OR "reservedQuantity" < 0
           OR "reservedQuantity" > "quantity" OR "minimumStock" < 0`,
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "Order"
        WHERE "subtotal" < 0 OR "discountTotal" < 0 OR "total" < 0
           OR ROUND(("subtotal" - "discountTotal")::numeric, 2) <> ROUND("total"::numeric, 2)`,
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "OrderItem"
        WHERE "quantity" <= 0 OR "price" < 0 OR "total" < 0
           OR ROUND(("price" * "quantity")::numeric, 2) <> ROUND("total"::numeric, 2)`,
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "StockTransferItem"
        WHERE "requestedQuantity" <= 0 OR "shippedQuantity" < 0
           OR "receivedQuantity" < 0 OR "shippedQuantity" > "requestedQuantity"
           OR "receivedQuantity" > "shippedQuantity"`,
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT "sku" FROM "Product" GROUP BY "sku" HAVING COUNT(*) > 1
        ) duplicates`,
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT "barcode" FROM "Product" WHERE "barcode" IS NOT NULL
          GROUP BY "barcode" HAVING COUNT(*) > 1
        ) duplicates`,
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT (
          (SELECT COUNT(*) FROM "HeroSlide" WHERE "startAt" IS NOT NULL AND "endAt" IS NOT NULL AND "startAt" >= "endAt") +
          (SELECT COUNT(*) FROM "CampaignBanner" WHERE "startAt" IS NOT NULL AND "endAt" IS NOT NULL AND "startAt" >= "endAt")
        )::bigint AS count`,
    ]);
  const result = {
    invalidInventory: Number(badInventory[0].count),
    invalidOrders: Number(badOrders[0].count),
    invalidOrderItems: Number(badItems[0].count),
    invalidTransferItems: Number(badTransfers[0].count),
    duplicateProductSkus: Number(duplicateSku[0].count),
    duplicateProductBarcodes: Number(duplicateBarcode[0].count),
    invalidCmsSchedules: Number(badCms[0].count),
  };
  console.info(JSON.stringify(result, null, 2));
  if (Object.values(result).some(Boolean)) process.exitCode = 1;
}

main().finally(() => db.$disconnect());
