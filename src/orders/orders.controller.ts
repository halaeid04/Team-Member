import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUser, GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PlaceOrderDto } from './dto/place-order.dto';
import { OrdersService } from './orders.service';

const orderExample = {
  id: 1,
  orderNumber: '560-1856473-4568485',
  status: 'PROCESSING',
  subtotal: 45980,
  total: 45980,
  shipToName: 'Nandhu Santhosh',
  placedAt: '2026-06-23T10:00:00.000Z',
  items: [
    {
      id: 1,
      productId: 2,
      title: 'Sony WH-1000XM4 Headphones (Black)',
      image: 'https://loremflickr.com/600/600/headphones?lock=21',
      price: 22990,
      quantity: 2,
      lineTotal: 45980,
    },
  ],
};

@ApiTags('Orders')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  @ApiResponse({
    status: 200,
    description: 'List of orders for the current user, newest first',
    schema: { example: { status: true, data: [orderExample] } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getOrders(@GetUser() user: AuthUser) {
    return this.ordersService.getOrders(user.id);
  }

  @Post()
  @ResponseMessage('Order placed successfully')
  @ApiOperation({ summary: 'Place an order from the cart' })
  @ApiBody({
    type: PlaceOrderDto,
    examples: {
      withDefaultAddress: {
        summary: 'Use the default address',
        value: {},
      },
      withAddress: { summary: 'Ship to a specific address', value: { addressId: 1 } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The placed order',
    schema: {
      example: {
        status: true,
        message: 'Order placed successfully',
        data: orderExample,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  placeOrder(@GetUser() user: AuthUser, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(user.id, dto);
  }
}
