import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { calculateOrder, checkoutSchema, createOrder, nextOrderNumber, state, trackOrder, updateStatus } from "./orders";
import { products } from "./catalog";

const valid = () => ({ firstName:"Aysel", lastName:"Məmmədova", phone:"+994 50 123 45 67", email:"", city:"Bakı", address:"Nizami küçəsi 10", deliveryNote:"", idempotencyKey:crypto.randomUUID(), items:[{ productId:products.find(p=>p.stock!=="Stokda yoxdur")!.id, quantity:2 }] });
beforeEach(()=>{state.orders.length=0;state.idempotency.clear();state.sequence={};});
test("order number uses yearly sequence",()=>{assert.equal(nextOrderNumber(new Date("2026-01-01")),"BNT-2026-000001");assert.equal(nextOrderNumber(new Date("2026-02-01")),"BNT-2026-000002")});
test("checkout validates Azerbaijan phone",()=>{assert.equal(checkoutSchema.safeParse(valid()).success,true);assert.equal(checkoutSchema.safeParse({...valid(),phone:"123"}).success,false)});
test("server catalogue price prevents client tampering",()=>{const input=valid();const result=calculateOrder(checkoutSchema.parse({...input,items:[{...input.items[0],price:0}]}));assert.equal(result.total,products.find(p=>p.id===input.items[0].productId)!.price*2)});
test("guest checkout creates order",()=>{const order=createOrder(valid());assert.equal(order.customerName,"Aysel Məmmədova");assert.equal(order.status,"NEW")});
test("duplicate submission is idempotent",()=>{const input=valid();assert.equal(createOrder(input).id,createOrder(input).id);assert.equal(state.orders.length,1)});
test("status update writes history",()=>{const order=createOrder(valid());updateStatus(order.orderNumber,"CONFIRMED");assert.equal(order.status,"CONFIRMED");assert.equal(order.history.at(-1)?.previousStatus,"NEW")});
test("tracking requires matching phone",()=>{const order=createOrder(valid());assert.equal(trackOrder(order.orderNumber,"+994501234567")?.id,order.id);assert.equal(trackOrder(order.orderNumber,"+994501111111"),undefined)});
