import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';
import { IsDate, IsEnum, IsNotEmpty, IsOptional,  } from 'class-validator';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {

   
    @IsNotEmpty()
    @IsEnum(['cash', 'esewa','khalti','fonepay'])
    paymentMethod: string;
  
    @IsNotEmpty()
    @IsEnum(['pending', 'paid', 'failed'])
    paymentStatus: string;

    @IsOptional()
    @IsDate()
    paymentDate?: Date;

}
