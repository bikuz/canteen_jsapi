import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderTimeFrameDto } from './create-ordertimeframe.dto';
import { IsNumber, IsEnum, IsOptional, IsString, IsNotEmpty,IsBoolean } from 'class-validator';

export class UpdateOrderTimeFrameDto extends PartialType(CreateOrderTimeFrameDto) {
    // @IsNumber()
    // orderingStartTime: number; // time in seconds

    // @IsNumber()    
    // orderingEndTime: number; // time in seconds

    
}
