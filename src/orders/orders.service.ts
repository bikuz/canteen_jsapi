import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './orders.model';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private configService: ConfigService,
  ) {}


  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try{
      const createdOrder = new this.orderModel(createOrderDto);
      const savedOrder= await createdOrder.save();
      return await savedOrder.populate('foodItems');

    }catch(error){
      throw new Error(`Error creating order: ${error.message}`)
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
      .lean()
      .exec();

    if (!existingOrder) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return existingOrder;
  }

  async findAll(filters: Record<string, any> = {}): Promise<Order[]> {
    try {
      // Use filters if provided, otherwise retrieve all documents
      return await this.orderModel
        .find(filters)
        .populate('foodItems')
        .lean()
        .exec();
    } catch (error) {
      throw new Error(`Error fetching orders: ${error.message}`);
    }
  }

  async filterOne(filters: Record<string, any>={}): Promise<Order | null> {
    try {
      // Use the provided filters to find a single document
      return await this.orderModel
        .findOne(filters)
        .populate('foodItems')
        .lean()
        .exec();
    } catch (error) {
      throw new Error(`Error fetching order: ${error.message}`);
    }
  }
  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).populate('foodItems').lean().exec();
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

  async isCancelAllowed(orderId: string): Promise<boolean> {
    try {
      // Only select the createdAt field we need
      const order = await this.orderModel
        .findById(orderId)
        .select('createdAt')
        .lean()
        .exec();

      if (!order) {
        throw new NotFoundException(`Order #${orderId} not found`);
      }

      const cancelTime = this.configService.get<string>('ORDER_CANCEL_TIME');
      const currentTime = new Date();
      const cancellationDeadline = new Date(order.createdAt);
      cancellationDeadline.setMinutes(cancellationDeadline.getMinutes() + parseInt(cancelTime));

      return currentTime <= cancellationDeadline;
      
    } catch (error) {
      throw new Error(`Error checking order cancellation: ${error.message}`);
    }
  }

  async remove(id: string): Promise<Order> {
    const deletedOrder = await this.orderModel.findByIdAndDelete(id).lean().exec();
    if (!deletedOrder) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return deletedOrder;
  }
}
