import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './payments.model';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(@InjectModel(Payment.name) private paymentModel: Model<Payment>) {}

  /**
   * Generates the next token for the day.
   * Tokens start from 101 every day and increment sequentially.
   */
  private async generateToken(): Promise<number> {
    // Get the current date's start (midnight)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Count the payments created since the start of the day
    const countToday = await this.paymentModel.countDocuments({
      createdAt: { $gte: startOfDay },
    });

    // Token starts from 101, so add 101 to the count
    return 101 + countToday;
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try{
      const token = await this.generateToken(); // Generate the token for this payment
      const newPayment = new this.paymentModel({
        ...createPaymentDto,
        token,
        paymentStatus:'pending',
      });

      const savedPayment = (await newPayment.save());
      return savedPayment.populate('order');
    }catch(error){
      throw new Error(`Error creating payment: ${error.message}`)
    }
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const filteredUpdate = Object.fromEntries(
      Object.entries(updatePaymentDto).filter(([_, value]) => value !== null && value !== undefined)
    );

    const existingPayment = await this.paymentModel
    .findByIdAndUpdate(id, updatePaymentDto, { new: true , lean:true})
    .populate('order')
    .exec();
    if (!existingPayment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }
    return existingPayment;
  }

  async updateStatus(id: string, status:string): Promise<Payment> {
    const updatePaymentDto={
      status:status
    };

    const filteredUpdate = Object.fromEntries(
      Object.entries(updatePaymentDto).filter(([_, value]) => value !== null && value !== undefined)
    );

    const existingPayment = await this.paymentModel
    .findByIdAndUpdate(id, updatePaymentDto, { new: true , lean:true})
    .populate('order')
    .exec();
    
    if (!existingPayment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }
    return existingPayment;
  }

  // async findAll(): Promise<Payment[]> {
  //   try{
  //     return this.paymentModel.find().populate('order').lean().exec();
  //   }catch (error) {
  //     throw new Error(`Error fetching payment: ${error.message}`);
  //   }
  // }
  async findAll(filters: Record<string, any> = {}): Promise<Payment[]> {
    try {
      // Use filters if provided, otherwise retrieve all documents
      return await this.paymentModel
        .find(filters)
        .populate('order')
        .lean()
        .exec();
    } catch (error) {
      throw new Error(`Error fetching payment: ${error.message}`);
    }
  }

  async filterOne(filters: Record<string, any>={}): Promise<Payment | null> {
    try {
      // Use the provided filters to find a single document
      return await this.paymentModel
        .findOne(filters)
        .populate('order')
        .lean()
        .exec();
    } catch (error) {
      throw new Error(`Error fetching payment: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentModel
      .findById(id)
      .populate('order')
      .lean().exec();
    if (!payment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }
    return payment;
  }

  async findByPage(page: number, limit: number): Promise<{ payments: Payment[]; total: number }> {
    try {
        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;

        // Fetch the categories with pagination
        const [payments, total] = await Promise.all([
            this.paymentModel.find().populate('order').skip(skip).limit(limit).lean().exec(),
            this.paymentModel.countDocuments().exec(),
        ]);

        // Return paginated data along with the total count
        return {
          payments,
          total,
        };
    } catch (error) {
        throw new Error(`Error fetching payment: ${error.message}`);
    }
  }

  async remove(id: string): Promise<Payment> {
    const deletedPayment = await this.paymentModel.findByIdAndDelete(id).exec();
    if (!deletedPayment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }
    return deletedPayment;
  }
}
