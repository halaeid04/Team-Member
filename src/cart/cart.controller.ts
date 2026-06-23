import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUser, GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

const cartItemExample = {
  id: 1,
  productId: 1,
  title: 'Sony WH-1000XM5 Headphones (Black)',
  slug: 'sony-wh-1000xm5-black',
  brand: 'Sony',
  image: 'https://loremflickr.com/600/600/headphones?lock=11',
  price: 22990,
  oldPrice: 29990,
  discountPercent: 23,
  ratingAverage: 4.5,
  ratingCount: 46626,
  quantity: 1,
  lineTotal: 22990,
};

const cartExample = {
  items: [cartItemExample],
  subtotal: 22990,
  totalItems: 1,
};

@ApiTags('Cart')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get my cart' })
  @ApiResponse({
    status: 200,
    description: 'The current user cart with totals',
    schema: { example: { status: true, data: cartExample } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCart(@GetUser() user: AuthUser) {
    return this.cartService.getCart(user.id);
  }

  @Post()
  @ResponseMessage('Added to cart')
  @ApiOperation({ summary: 'Add a product to the cart' })
  @ApiBody({
    type: AddToCartDto,
    examples: {
      addItem: {
        summary: 'Add to cart body',
        value: { productId: 1, quantity: 1 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Updated cart',
    schema: {
      example: { status: true, message: 'Added to cart', data: cartExample },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addToCart(@GetUser() user: AuthUser, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user.id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Removed from cart')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  @ApiParam({ name: 'id', description: 'Cart item ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Updated cart',
    schema: {
      example: {
        status: true,
        message: 'Removed from cart',
        data: { items: [], subtotal: 0, totalItems: 0 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeFromCart(
    @GetUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.removeFromCart(user.id, id);
  }
}
