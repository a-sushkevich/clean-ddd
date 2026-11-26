import { Inject, Injectable } from '@nestjs/common';
import { OrderRepositoryPort } from '../../domain/ports/order.repository.port';
import {
  DRIZZLE,
  type DrizzleDB,
} from '../../../shared/infrastructure/database/postgres/drizzle.provider';
import { Order } from '../../domain/entities/order.entity';
import {
  orderItems,
  orders,
} from '../../../shared/infrastructure/database/postgres/schema/orders.schema';
import { OrderItem } from '../../domain/entities/order-item.entity';
import { and, eq, notInArray } from 'drizzle-orm';

@Injectable()
export class DrizzleOrderRepository implements OrderRepositoryPort {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async save(order: Order): Promise<void> {
    const orderRow = DrizzleOrderRepository.toOrderPersistence(order);
    const itemRows = order.items.map((item) =>
      DrizzleOrderRepository.toItemPersistence(item, order.id.getValue()),
    );

    await this.db.transaction(async (tx) => {
      await tx
        .insert(orders)
        .values(orderRow)
        .onConflictDoUpdate({
          target: orders.id,
          set: {
            status: orderRow.status,
            totalAmount: orderRow.totalAmount,
            totalCurrency: orderRow.totalCurrency,
            shippingStreet: orderRow.shippingStreet,
            shippingCity: orderRow.shippingCity,
            shippingState: orderRow.shippingState,
            shippingZipCode: orderRow.shippingZipCode,
            shippingCountry: orderRow.shippingCountry,
            trackingNumber: orderRow.trackingNumber,
            notes: orderRow.notes,
            updatedAt: orderRow.updatedAt,
          },
        });

      for (const itemRow of itemRows) {
        await tx
          .insert(orderItems)
          .values(itemRow)
          .onConflictDoUpdate({
            target: orderItems.id,
            set: {
              productName: itemRow.productName,
              unitPriceAmount: itemRow.unitPriceAmount,
              unitPriceCurrency: itemRow.unitPriceCurrency,
              quantity: itemRow.quantity,
              discountAmount: itemRow.discountAmount,
              discountCurrency: itemRow.discountCurrency,
            },
          });
      }

      const currentItemIds = itemRows.map((r) => r.id);
      if (currentItemIds.length > 0) {
        await tx
          .delete(orderItems)
          .where(
            and(
              eq(orderItems.orderId, order.id.getValue()),
              notInArray(orderItems.id, currentItemIds),
            ),
          );
      } else {
        await tx
          .delete(orderItems)
          .where(eq(orderItems.orderId, order.id.getValue()));
      }
    });
  }

  private static toOrderPersistence(order: Order): typeof orders.$inferSelect {
    const total = order.getTotal();

    return {
      id: order.id.getValue(),
      customerId: order.customerId,
      status: order.status.getValue(),
      totalAmount: total.toCents(),
      totalCurrency: total.getCurrency(),
      shippingStreet: order.shippingAddress.street,
      shippingCity: order.shippingAddress.city,
      shippingState: order.shippingAddress.state,
      shippingZipCode: order.shippingAddress.zipCode,
      shippingCountry: order.shippingAddress.country,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private static toItemPersistence(
    item: OrderItem,
    orderId: string,
  ): typeof orderItems.$inferSelect {
    return {
      id: item.getId().getValue(),
      orderId,
      productId: item.productId,
      productName: item.productName,
      unitPriceAmount: item.unitPrice.toCents(),
      unitPriceCurrency: item.unitPrice.getCurrency(),
      quantity: item.quantity,
      discountAmount: item.discount?.toCents() ?? null,
      discountCurrency: item.discount?.getCurrency() ?? null,
      createdAt: new Date(),
    };
  }
}
