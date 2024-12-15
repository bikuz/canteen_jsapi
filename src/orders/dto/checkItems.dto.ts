import { IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckItemsDto {
  @ApiProperty({
    type: [String], // Array of strings
    description: 'Array of food item IDs to check availability',
    example: ['6749fb9d167eea903ddfddff', '674ab7af4d19860fd01fee21'],
  })
  @IsArray()
  @IsNotEmpty({ each: true }) // Ensures no empty IDs are passed
  foodItems: string[];
}
