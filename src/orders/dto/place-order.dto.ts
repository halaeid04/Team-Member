import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class PlaceOrderDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Address to ship to. Defaults to the user default address when omitted.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  addressId?: number;
}
