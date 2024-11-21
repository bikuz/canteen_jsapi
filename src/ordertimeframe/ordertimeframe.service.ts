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

    
    async findByFields(filters: Record<string, any>): Promise<OrderTimeFrame[]> {
      const ordertimeframe = await this.orderTimeFrameModel.find(filters).exec();
      if (ordertimeframe.length === 0) {
          throw new NotFoundException(`No OrderTimeFrame found with the given filters: ${JSON.stringify(filters)}`);
      }
      return ordertimeframe;
    }

    async findOrderTimeframe(entityType: string, entityId: string): Promise<OrderTimeFrame>{
      
      const ordertimeframe = await this.orderTimeFrameModel.findOne({
          applicableTo: entityType,
          applicableId: entityId,
        });

      if (ordertimeframe) {
          throw new NotFoundException(`No OrderTimeFrame found with entityType: ${entityType}, enttityID: ${entityId}`);
      }
      return ordertimeframe;  
      
    }

    async remove(id: string): Promise<any>;
    async remove(entityType: string, entityId: string): Promise<any>;
    async remove(param1: string, param2?: string): Promise<any> {
      try {
        if (param2 === undefined) {
          // First overload: remove by ID
          const result = await this.orderTimeFrameModel.findByIdAndDelete(param1).exec();

          if (!result) {
            throw new NotFoundException(`OrderTimeFrame #${param1} not found`);
          }

          return result;
        } else {
          // Second overload: remove by entityType and entityId
          const orderingTimeframe = await this.orderTimeFrameModel.findOne({
            applicableTo: param1,
            applicableId: param2,
          });

          if (orderingTimeframe) {
            await this.orderTimeFrameModel.deleteOne({ _id: orderingTimeframe._id });
          }

          return `OrderTimeFrame for entityType: ${param1} and entityId: ${param2} has been removed successfully.`;
        }
      } catch (error) {
        throw new Error('Error removing OrderTimeFrame');
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
