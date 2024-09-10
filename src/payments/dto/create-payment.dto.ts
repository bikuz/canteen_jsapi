import { IsNotEmpty, IsMongoId, IsEnum, IsNumber } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsMongoId()
  orderId: string;

  @IsNotEmpty()
  @IsEnum(['cash', 'esewa', 'khalti'])
  paymentMethod: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
