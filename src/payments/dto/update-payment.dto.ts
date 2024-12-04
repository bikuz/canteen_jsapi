import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';
import { IsDate, IsEnum, IsNotEmpty, IsOptional,  } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {

   
    @IsNotEmpty()
    @IsEnum(['cash', 'esewa','khalti','fonepay'])
    @ApiProperty({ description: 'Payment method', example: 'cash, esewa, khalit, fonepay' })
    paymentMethod: string;
  
    @IsNotEmpty()
    @IsEnum(['pending', 'paid', 'failed' ,'refund', 'cancelled'])
    @ApiProperty({ description: 'Payment status', example: 'pending, paid, failed, refund, cancelled' })
    paymentStatus: string;

    @IsOptional()
    @IsDate()
    @ApiPropertyOptional({ description: 'Payment date', example: '' })
    paymentDate?: Date;

}
