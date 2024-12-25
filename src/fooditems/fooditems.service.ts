import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FoodItem } from './fooditems.model';
import { CreateFoodItemDto, UpdateFoodItemDto } from './dto';
import { OrderTimeFrameService } from '../ordertimeframe/ordertimeframe.service';
// import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class FoodItemsService {
    constructor(
        @InjectModel(FoodItem.name) private foodItemModel:Model<FoodItem>,
        private readonly orderTimeFrameService:OrderTimeFrameService,
        // private readonly categoryService:CategoriesService,
    ){}

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
            { new: true, lean: true },
        ).exec();
        if (!existingFoodItem) {
            throw new NotFoundException(`FoodItem #${id} not found`);
        }
        return existingFoodItem;
    }

    async findAll(): Promise<FoodItem[]> {
        try {
            // return await this.foodItemModel.find().populate('category').lean().exec();
            return await this.foodItemModel.find().lean().exec();
        } catch (error) {
            throw new Error(`Error fetching food items: ${error.message}`);
        }
    }

    async findOne(id: string): Promise<FoodItem> {
        // const foodItem = await this.foodItemModel.findById(id).populate('category').lean().exec();
        const foodItem = await this.foodItemModel.findById(id).lean().exec();
        if (!foodItem) {
            throw new NotFoundException(`FoodItem #${id} not found`);
        }
        return foodItem;
    }

    async findByFields(filters: Record<string, any>): Promise<FoodItem[]> {
        // const foodItems = await this.foodItemModel.find(filters).populate('category').exec();
        const foodItems = await this.foodItemModel.find(filters).lean().exec();
        if (foodItems.length === 0) {
            throw new NotFoundException(`No FoodItems found with the given filters: ${JSON.stringify(filters)}`);
        }
        return foodItems;
    }
    
    async findByPage(page: number, limit: number): Promise<{ fooditems: FoodItem[]; total: number }> {
        try {
            // Calculate the number of documents to skip
            const skip = (page - 1) * limit;
    
            // Fetch the categories with pagination
            const [fooditems, total] = await Promise.all([
                this.foodItemModel.find().skip(skip).limit(limit).lean().exec(),
                this.foodItemModel.countDocuments().exec(),
            ]);
    
            // Return paginated data along with the total count
            return {
                fooditems,
                total,
            };
        } catch (error) {
            throw new Error(`Error fetching categories: ${error.message}`);
        }
    }

    async findByPageByCategory(page: number, limit: number, categoryId: string): Promise<{ fooditems: FoodItem[]; total: number }> {
        try {
            const skip = (page - 1) * limit;
            const [fooditems, total] = await Promise.all([
                this.foodItemModel.find({ category: categoryId }).skip(skip).limit(limit).lean().exec(),
                this.foodItemModel.countDocuments({ category: categoryId }).exec(),
            ]);
            return { fooditems, total };
        } catch (error) {
            throw new Error(`Error fetching food items by category: ${error.message}`);
        }
    }

    async isOrderingAllowed(id:string): Promise<boolean>{
        try{
            const fooditem = await this.foodItemModel.findById(id).lean().exec();
            if (!fooditem) {
                throw new NotFoundException(`FoodItem #${id} not found`);
            }

            const isOrderingAllowed_cat = await this.orderTimeFrameService.isOrderingAllowed('category', fooditem.category.toString());
            const isOrderingAllowed_food = await this.orderTimeFrameService.isOrderingAllowed('fooditems', id);
            const isOrderingAllowed = isOrderingAllowed_cat && isOrderingAllowed_food;

            return isOrderingAllowed;

        }catch(error){
            throw new Error(error.message);
        }

    }

    async remove(id: string): Promise<FoodItem> {
        try{
            // delete associate OrderTimeFrame
            this.orderTimeFrameService.remove('category',id);

            // proceed to delete fooditem
            const deletedFoodItem = await this.foodItemModel.findByIdAndDelete(id).exec();
            if (!deletedFoodItem) {
                throw new NotFoundException(`FoodItem #${id} not found`);
            }
            return deletedFoodItem;
        }catch(error){
            throw new Error('Error deleting FoodItem');
        }
    }

}
