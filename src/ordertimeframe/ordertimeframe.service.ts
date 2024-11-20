import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// import { Category } from '../categories/categories.model';
// import { FoodItem } from '../fooditems/fooditems.model';
// import { Menu } from '../menus/menus.model';

import { OrderTimeFrame } from './ordertimeframe.model';
import { CreateOrderTimeFrameDto } from './dto';
import { UpdateOrderTimeFrameDto } from './dto';

@Injectable()
export class OrderTimeFrameService {
    constructor(
        @InjectModel(OrderTimeFrame.name) private orderTimeFrameModel: Model<OrderTimeFrame>,
        // @InjectModel(Category.name) private categoryModel: Model<Category>,
        // @InjectModel(FoodItem.name) private foodItemModel: Model<FoodItem>,
        // @InjectModel(Menu.name) private menuModel: Model<Menu>
    ) {}

    async create(createOrderTimeframeDto: CreateOrderTimeFrameDto): Promise<OrderTimeFrame> {
        const orderingTimeframe = new this.orderTimeFrameModel(createOrderTimeframeDto);
        return orderingTimeframe.save();
    }
   
    async update(id: string, updateOrderTimeFrameDto: UpdateOrderTimeFrameDto): Promise<OrderTimeFrame> {
        const updatedData = await this.orderTimeFrameModel.findByIdAndUpdate(
            id, updateOrderTimeFrameDto, {
            new: true, lean: true
        }).exec();

        if (!updatedData) {
            throw new NotFoundException(`OrderTimeFrame with ID ${id} not found`);
        }
    
        return updatedData;
    }

    async remove(id: string) {
        
        try{
            // Proceed to delete the category
            const result = await this.orderTimeFrameModel.findByIdAndDelete(id).exec();
             
            if (!result) {
                throw new NotFoundException(`OrderTimeFrame #${id} not found`);
            }
            
            return result;

        }
        catch(error){
            throw new Error('Error deleting OrderTimeFrame')
        }
    }

    async findOrderTimeframe(entityType: string, entityId: string){
      try{
        return await this.orderTimeFrameModel.findOne({
          applicableTo: entityType,
          applicableId: entityId,
        });
        
      }catch (error) {
            throw new Error('Error finding OrderTimeTrame')
           
        }
    }

    async removeOrderTimeframe(entityType: string, entityId: string) {
        try {
          // Check if the ordering timeframe exists
          const orderingTimeframe = await this.orderTimeFrameModel.findOne({
            applicableTo: entityType,
            applicableId: entityId,
          });

          // Remove the ordering timeframe
          if (orderingTimeframe) {
            // Remove the ordering timeframe
            await this.orderTimeFrameModel.deleteOne({
              _id: orderingTimeframe._id,
            });
          } 
        //   else {
        //     console.log('Ordering timeframe does not exist.');
        //     // throw new NotFoundException(
        //     //     `OrderTimeTrame not found for entityType: ${entityType} and entityId: ${entityId}`,
        //     //   );
        //   }
      
          return `OrderTimeTrame for entityType: ${entityType} and entityId: ${entityId} has been removed successfully.`;
        } catch (error) {
            throw new Error('Error removing OrderTimeTrame')
           
        }
      }
      
      async isOrderingAllowed(entityType: string, entityId: string): Promise<boolean>;
      async isOrderingAllowed(ordertimeframe: OrderTimeFrame): Promise<boolean>;
      async isOrderingAllowed(
        entityTypeOrTimeframe: string | OrderTimeFrame,
        entityId?: string,
      ): Promise<boolean> {
        if (typeof entityTypeOrTimeframe === 'string') {
          // Handle the case where entityType and entityId are passed
          const entityType = entityTypeOrTimeframe;
          const timeframe = await this.orderTimeFrameModel.findOne({
            applicableTo: entityType,
            applicableId: entityId,
            isActive: true,
          });
      
          if (!timeframe) return true; // No time frame means always allowed
      
          const now = new Date();
          const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
          return (
            currentSeconds >= timeframe.orderingStartTime &&
            currentSeconds <= timeframe.orderingEndTime
          );
        } else {
          // Handle the case where OrderTimeFrame is passed
          if(!entityTypeOrTimeframe) return true;
          
          const ordertimeframe = entityTypeOrTimeframe;
          const now = new Date();
          const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
          return (
            currentSeconds >= ordertimeframe.orderingStartTime &&
            currentSeconds <= ordertimeframe.orderingEndTime
          );
        }
      }
}
