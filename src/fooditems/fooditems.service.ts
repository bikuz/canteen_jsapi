import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FoodItem } from './fooditems.model';
import { CreateFoodItemDto, UpdateFoodItemDto } from './dto';

@Injectable()
export class FoodItemsService {
    constructor(@InjectModel(FoodItem.name) private foodItemModel:Model<FoodItem>){}

    async create(createFoodItemDto: CreateFoodItemDto): Promise<FoodItem>{
        const createdFoodItem = new this.foodItemModel(createFoodItemDto);
        return createdFoodItem.save();
    }

    async findAll():Promise<FoodItem[]>{
        return this.foodItemModel.find().populate('category comboItems').exec();
    }

    async findOne(id:string): Promise<FoodItem>{
        const foodItem = await this.foodItemModel.findById(id).populate('category comboItems').exec();
        if(!foodItem){
            throw new NotFoundException('FoodItem #${id} not found');
        }
        return foodItem;
    }

    async update(id:string, updateFoodItemDto: UpdateFoodItemDto): Promise<FoodItem>{
        const existingFoodItem= await this.foodItemModel.findByIdAndUpdate(id, updateFoodItemDto, {new:true}).exec();
        if(!existingFoodItem){
            throw new NotFoundException('FoodItem #${id} not found');
        }
        return existingFoodItem;
    }

    async remove(id: string): Promise<FoodItem>{
        const deletedFoodItem = await this.foodItemModel.findByIdAndDelete(id).exec();
        if(!deletedFoodItem){
            throw new NotFoundException('FoodItem #${id} not found');
        }
        return deletedFoodItem
    }

}
