-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_updatedAt_idx" ON "Customer"("updatedAt");

-- CreateIndex
CREATE INDEX "Inventory_productId_idx" ON "Inventory"("productId");

-- CreateIndex
CREATE INDEX "Inventory_variantId_idx" ON "Inventory"("variantId");

-- CreateIndex
CREATE INDEX "InventoryMovement_type_createdAt_idx" ON "InventoryMovement"("type", "createdAt");

-- CreateIndex
CREATE INDEX "LoginHistory_success_createdAt_idx" ON "LoginHistory"("success", "createdAt");

-- CreateIndex
CREATE INDEX "Order_phone_createdAt_idx" ON "Order"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "Order_assignedBranchId_createdAt_idx" ON "Order"("assignedBranchId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Product_brandId_active_idx" ON "Product"("brandId", "active");

-- CreateIndex
CREATE INDEX "Product_categoryId_active_idx" ON "Product"("categoryId", "active");

-- CreateIndex
CREATE INDEX "Product_active_createdAt_idx" ON "Product"("active", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_fromBranchId_status_idx" ON "StockTransfer"("fromBranchId", "status");

-- CreateIndex
CREATE INDEX "StockTransfer_toBranchId_status_idx" ON "StockTransfer"("toBranchId", "status");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_branchId_isActive_idx" ON "User"("branchId", "isActive");

-- Fast case-insensitive partial searches used by the admin panels.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_sku_trgm_idx" ON "Product" USING GIN ("sku" gin_trgm_ops);
CREATE INDEX "Order_number_trgm_idx" ON "Order" USING GIN ("orderNumber" gin_trgm_ops);
CREATE INDEX "Order_customer_trgm_idx" ON "Order" USING GIN ("customerName" gin_trgm_ops);
CREATE INDEX "Brand_name_trgm_idx" ON "Brand" USING GIN ("name" gin_trgm_ops);

-- Business invariants enforced at database level.
ALTER TABLE "Inventory"
  ADD CONSTRAINT "Inventory_quantity_nonnegative" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "Inventory_reserved_nonnegative" CHECK ("reservedQuantity" >= 0),
  ADD CONSTRAINT "Inventory_reserved_within_quantity" CHECK ("reservedQuantity" <= "quantity"),
  ADD CONSTRAINT "Inventory_minimum_nonnegative" CHECK ("minimumStock" >= 0);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_money_nonnegative" CHECK (
    "subtotal" >= 0 AND "discountTotal" >= 0 AND "total" >= 0
  );

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderItem_money_nonnegative" CHECK ("price" >= 0 AND "total" >= 0);

ALTER TABLE "StockTransferItem"
  ADD CONSTRAINT "Transfer_quantities_valid" CHECK (
    "requestedQuantity" > 0 AND
    "shippedQuantity" >= 0 AND
    "receivedQuantity" >= 0 AND
    "shippedQuantity" <= "requestedQuantity" AND
    "receivedQuantity" <= "shippedQuantity"
  );
