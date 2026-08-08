import type { Order } from "./orders";
import { logger } from "./logger";

export type NotificationProvider = {
  sendOrderConfirmation(order: Order): Promise<void>;
};

class NoopProvider implements NotificationProvider {
  async sendOrderConfirmation() {
    return;
  }
}

export const notifications: NotificationProvider = new NoopProvider();

export async function notifyOrder(order: Order) {
  try {
    await notifications.sendOrderConfirmation(order);
  } catch (error) {
    logger.error("notification.order_confirmation_failed", {
      error,
      orderNumber: order.orderNumber,
    });
  }
}
