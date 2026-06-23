import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /** Full cart with line items and totals for the current user. */
  async getCart(userId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      include: {
        product: {
          include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        },
      },
    });

    return this.toCart(items);
  }

  /** Add a product to the cart (or bump its quantity if already there). */
  async addToCart(userId: number, dto: AddToCartDto) {
    const quantity = dto.quantity ?? 1;

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, isActive: true },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException(
        `Product with id ${dto.productId} not found`,
      );
    }

    await this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId: dto.productId } },
      create: { userId, productId: dto.productId, quantity },
      update: { quantity: { increment: quantity } },
    });

    return this.getCart(userId);
  }

  /** Remove a single cart line (by cart item id) for the current user. */
  async removeFromCart(userId: number, itemId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  /** Shape cart items into the response envelope with totals. */
  private toCart(
    items: Array<{
      id: number;
      quantity: number;
      product: {
        id: number;
        title: string;
        slug: string;
        brand: string | null;
        price: number;
        oldPrice: number | null;
        discountPercent: number | null;
        ratingAverage: number;
        ratingCount: number;
        images?: { url: string }[];
      };
    }>,
  ) {
    const lines = items.map((item) => {
      const { product } = item;
      const lineTotal = round2(product.price * item.quantity);
      return {
        id: item.id,
        productId: product.id,
        title: product.title,
        slug: product.slug,
        brand: product.brand,
        image: product.images?.[0]?.url ?? null,
        price: product.price,
        oldPrice: product.oldPrice,
        discountPercent: product.discountPercent,
        ratingAverage: product.ratingAverage,
        ratingCount: product.ratingCount,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
    const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);

    return { items: lines, subtotal, totalItems };
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
