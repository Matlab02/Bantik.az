-- Phase 3: customer profiles and complete request-order workflow.
ALTER TYPE "OrderStatus" RENAME VALUE 'CONTACTING' TO 'CONTACTING_CUSTOMER';
ALTER TYPE "OrderStatus" RENAME VALUE 'DISPATCHED' TO 'OUT_FOR_DELIVERY';

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL, "userId" TEXT, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL,
  "phone" TEXT NOT NULL, "email" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

CREATE TABLE "CustomerAddress" (
  "id" TEXT NOT NULL, "customerId" TEXT NOT NULL, "label" TEXT NOT NULL, "city" TEXT NOT NULL,
  "address" TEXT NOT NULL, "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrderNote" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "authorId" TEXT, "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrderSequence" ("year" INTEGER NOT NULL, "value" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("year"));

ALTER TABLE "Order" RENAME COLUMN "number" TO "orderNumber";
ALTER INDEX "Order_number_key" RENAME TO "Order_orderNumber_key";
ALTER TABLE "Order" RENAME COLUMN "branchId" TO "assignedBranchId";
ALTER TABLE "Order" ADD COLUMN "assignedUserId" TEXT;
ALTER TABLE "Order" ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Bakı';
ALTER TABLE "Order" RENAME COLUMN "note" TO "deliveryNote";
ALTER TABLE "Order" ADD COLUMN "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEBSITE';
UPDATE "Order" SET "address" = '' WHERE "address" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "address" SET NOT NULL;
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT "Order_branchId_fkey";

ALTER TABLE "OrderItem" ALTER COLUMN "variantId" DROP NOT NULL;
ALTER TABLE "OrderItem" RENAME COLUMN "unitPrice" TO "price";
ALTER TABLE "OrderItem" ADD COLUMN "productId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItem" ADD COLUMN "sku" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItem" ADD COLUMN "variantName" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "total" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";

ALTER TABLE "OrderStatusHistory" RENAME COLUMN "status" TO "newStatus";
ALTER TABLE "OrderStatusHistory" ADD COLUMN "previousStatus" "OrderStatus";
ALTER TABLE "OrderStatusHistory" ADD COLUMN "changedBy" TEXT NOT NULL DEFAULT 'SYSTEM';

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedBranchId_fkey" FOREIGN KEY ("assignedBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
