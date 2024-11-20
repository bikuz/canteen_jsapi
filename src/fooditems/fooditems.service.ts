import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FoodItem } from './fooditems.model';
import { CreateFoodItemDto, UpdateFoodItemDto } from './dto';

@Injectable()
export class FoodItemsService {
    constructor(@InjectModel(FoodItem.name) private foodItemModel:Model<FoodItem>){}

    async create(createFoodItemDto: CreateFoodItemDto): Promise<FoodItem> {
        try {
            const createdFoodItem = new this.foodItemModel(createFoodItemDto);
            return await createdFoodItem.save();
        } catch (error) {
            throw new Error(`Error creating food item: ${error.message}`);
        }
    }

    async update(id: string, updateFoodItemDto: UpdateFoodItemDto): Promise<FoodItem> {
        const existingFoodItem = await this.foodItemModel.findByIdAndUpdate(
            id,
            updateFoodItemDto,
            { new: true },
        ).exec();
        if (!existingFoodItem) {
            throw new NotFoundException(`FoodItem #${id} not found`);
        }
        return existingFoodItem;
    }

    async findAll(): Promise<FoodItem[]> {
        try {
            return await this.foodItemModel.find().populate('category').exec();
        } catch (error) {
            throw new Error(`Error fetching food items: ${error.message}`);
        }
    }

    async findOne(id: string): Promise<FoodItem> {
        const foodItem = await this.foodItemModel.findById(id).populate('category').exec();
        if (!foodItem) {
            throw new NotFoundException(`FoodItem #${id} not found`);
        }
        return foodItem;
    }

    async findByFields(filters: Record<string, any>): Promise<FoodItem[]> {
        const foodItems = await this.foodItemModel.find(filters).populate('category').exec();
        if (foodItems.length === 0) {
            throw new NotFoundException(`No FoodItems found with the given filters: ${JSON.stringify(filters)}`);
        }
        return foodItems;
    }
    

    async remove(id: string): Promise<FoodItem> {
        const deletedFoodItem = await this.foodItemModel.findByIdAndDelete(id).exec();
        if (!deletedFoodItem) {
            throw new NotFoundException(`FoodItem #${id} not found`);
        }
        return deletedFoodItem;
    }

}
