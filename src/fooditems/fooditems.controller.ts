import { Controller, Get, Post, Body, Param, Patch, Delete, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { FoodItemsService } from './fooditems.service';
import { CreateFoodItemDto, UpdateFoodItemDto } from './dto';

@Controller('fooditems')
export class FooditemsController {
    constructor(private readonly foodItemService: FoodItemsService){}

    @Post()
    async create(@Body() createFoodItemDto: CreateFoodItemDto) {
        try {
            return await this.foodItemService.create(createFoodItemDto);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get()
    async findAll() {
        try {
            return await this.foodItemService.findAll();
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        try {
            return await this.foodItemService.findOne(id);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateFoodItemDto: UpdateFoodItemDto) {
        try {
            return await this.foodItemService.update(id, updateFoodItemDto);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        try {
            return await this.foodItemService.remove(id);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
