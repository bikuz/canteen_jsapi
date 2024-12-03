import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './orders.model';
import { CreateOrderDto, UpdateOrderDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try{
      const createdOrder = new this.orderModel(createOrderDto);
      const savedOrder= await createdOrder.save();
      return await savedOrder.populate('foodItems');

    }catch(error){
      throw new Error(`Error creating menu: ${error.message}`)
    }

  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    // Filter out null or undefined values from updateMenuDto
    const filteredUpdate = Object.fromEntries(
      Object.entries(updateOrderDto).filter(([_, value]) => value !== null && value !== undefined)
    );

    const existingOrder = await this.orderModel
      .findByIdAndUpdate(id, filteredUpdate, { new: true,lean:true })
      .populate('foodItems')
      .exec();

    if (!existingOrder) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return existingOrder;
  }

  async findAll(): Promise<Order[]> {
    try{
      return await this.orderModel.find().populate('foodItems').exec();
    }catch (error) {
      throw new Error(`Error fetching orders: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).populate('foodItems').exec();
    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return order;
  }

  async findByPage(page: number, limit: number): Promise<{ orders: Order[]; total: number }> {
    try {
        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;

        // Fetch the categories with pagination
        const [orders, total] = await Promise.all([
            this.orderModel.find().populate('foodItems').skip(skip).limit(limit).lean().exec(),
            this.orderModel.countDocuments().exec(),
        ]);

        // Return paginated data along with the total count
        return {
          orders,
          total,
        };
    } catch (error) {
        throw new Error(`Error fetching orders: ${error.message}`);
    }
  }

  async remove(id: string): Promise<Order> {
    const deletedOrder = await this.orderModel.findByIdAndDelete(id).exec();
    if (!deletedOrder) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return deletedOrder;
  }
}
