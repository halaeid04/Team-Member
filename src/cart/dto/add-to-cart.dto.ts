import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ example: 1, description: 'Product ID to add to the cart' })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Quantity to add (added to any existing quantity)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}
