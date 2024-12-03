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
    const token = await this.generateToken(); // Generate the token for this payment
    const newPayment = new this.paymentModel({
      ...createPaymentDto,
      token,
    });

    const savedPayment = (await newPayment.save());
    return savedPayment.populate('order');
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().populate('order').lean().exec();
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

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const existingPayment = await this.paymentModel
    .findByIdAndUpdate(id, updatePaymentDto, { new: true , lean:true})
    .exec();
    if (!existingPayment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }
    return existingPayment;
  }

  async remove(id: string): Promise<Payment> {
    const deletedPayment = await this.paymentModel.findByIdAndDelete(id).exec();
    if (!deletedPayment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }
    return deletedPayment;
  }
}
