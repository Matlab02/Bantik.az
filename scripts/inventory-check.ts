import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const [inventory, duplicateActions] = await Promise.all([
    db.inventory.findMany({
      where: {
        OR: [
          { quantity: { lt: 0 } },
          { reservedQuantity: { lt: 0 } },
          { minimumStock: { lt: 0 } },
        ],
      },
      select: { id: true },
      take: 10,
    }),
    db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "orderId", "action" FROM "InventoryOrderAction"
        GROUP BY "orderId", "action" HAVING COUNT(*) > 1
      ) duplicates`,
  ]);
  const reservedOverflow = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "Inventory"
    WHERE "reservedQuantity" > "quantity"`;
  const result = {
    invalidRows: inventory.length,
    reservedOverflow: Number(reservedOverflow[0].count),
    duplicateOrderActions: Number(duplicateActions[0].count),
  };
  console.info(JSON.stringify(result, null, 2));
  if (Object.values(result).some(Boolean)) process.exitCode = 1;
}

main().finally(() => db.$disconnect());
