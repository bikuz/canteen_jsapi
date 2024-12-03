import { IsNotEmpty, IsMongoId, IsEnum, IsNumber, IsOptional,IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsMongoId()
  customer: string;

  @IsNotEmpty()
  @IsMongoId()
  order: string;

  @IsNotEmpty()
  @IsEnum(['cash', 'esewa','khalti','fonepay'])
  paymentMethod: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed'])
  paymentStatus?: string|null;

  @IsOptional()
  @IsNumber()
  token?: number | null;

  // @IsOptional()
  // @IsString()
  // transactionId?: string;

}
