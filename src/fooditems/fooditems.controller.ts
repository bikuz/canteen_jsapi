import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { FoodItemsService } from './fooditems.service';
import { CreateFoodItemDto, UpdateFoodItemDto } from './dto';

@Controller('fooditems')
export class FooditemsController {
    constructor(private readonly foodItemsService: FoodItemsService){}

    @Post()
    async create(@Body() createFoodItemDto: CreateFoodItemDto){
        return this.foodItemsService.create(createFoodItemDto);
    }

    @Get()
    async findAll(){
        return this.foodItemsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string){
        return this.foodItemsService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id:string, @Body() updateFoodItemDto:UpdateFoodItemDto){
        return this.foodItemsService.update(id, updateFoodItemDto);
    }

    @Delete(':id')
    async remove(@Param('id') id:string){
        return this.foodItemsService.remove(id);
    }
}
