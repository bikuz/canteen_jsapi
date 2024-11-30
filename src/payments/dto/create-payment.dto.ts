import { IsNotEmpty, IsMongoId, IsEnum, IsNumber, IsOptional,IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsMongoId()
  customerId: string;

  @IsNotEmpty()
  @IsMongoId()
  orderId: string;

  @IsNotEmpty()
  @IsEnum(['cash', 'esewa','khalti','fonepay'])
  paymentMethod: string;

  @IsNotEmpty()
  @IsEnum(['pending', 'paid', 'failed'])
  paymentStatus: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  token?: number | null;

  @IsOptional()
  @IsString()
  transactionId?: string;

}
