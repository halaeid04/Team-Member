import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlaceOrderDto } from './dto/place-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /** Turn the current user cart into an order, then empty the cart. */
  async placeOrder(userId: number, dto: PlaceOrderDto) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      include: {
        product: {
          include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        },
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const shipToName = await this.resolveShipToName(userId, dto.addressId);

    const orderItems = cartItems.map((item) => ({
      productId: item.product.id,
      title: item.product.title,
      image: item.product.images?.[0]?.url ?? null,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const subtotal = round2(
      orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          orderNumber: this.generateOrderNumber(),
          status: 'PROCESSING',
          subtotal,
          total: subtotal,
          shipToName,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { userId } });
      return created;
    });

    return this.toOrder(order);
  }

  /** All orders for the current user, newest first. */
  async getOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    return orders.map((o) => this.toOrder(o));
  }

  private async resolveShipToName(userId: number, addressId?: number) {
    if (addressId) {
      const address = await this.prisma.address.findUnique({
        where: { id: addressId },
      });
      if (!address || address.userId !== userId) {
        throw new NotFoundException('Address not found');
      }
      return address.name;
    }

    const defaultAddress = await this.prisma.address.findFirst({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    if (defaultAddress) {
      return defaultAddress.name;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    return user?.fullName ?? 'Customer';
  }

  private toOrder(order: {
    id: number;
    orderNumber: string;
    status: string;
    subtotal: number;
    total: number;
    shipToName: string;
    createdAt: Date;
    items: Array<{
      id: number;
      productId: number | null;
      title: string;
      image: string | null;
      price: number;
      quantity: number;
    }>;
  }) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal,
      total: order.total,
      shipToName: order.shipToName,
      placedAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.title,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        lineTotal: round2(item.price * item.quantity),
      })),
    };
  }

  /** Build an Amazon-style order number, e.g. 560-1856473-4568485. */
  private generateOrderNumber() {
    const part = (length: number) => {
      let out = '';
      for (let i = 0; i < length; i += 1) {
        out += Math.floor(Math.random() * 10).toString();
      }
      return out;
    };
    return `${part(3)}-${part(7)}-${part(7)}`;
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
