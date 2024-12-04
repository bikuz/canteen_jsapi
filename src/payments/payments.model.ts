import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';

@Schema()
export class Payment extends Document {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customer: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  order: string;
  
  // @Prop({ type: String, unique: true, required: false })
  // transactionId: string | null;
  
  @Prop({ required: true, enum: ['cash', 'esewa','khalti','fonepay'] })
  paymentMethod: string; // 'cash', 'eSewa', 'Khalti', 'fonepay'

  @Prop({ required: true, enum: ['pending', 'paid', 'failed','refund','cancelled'] })  
  paymentStatus: string;

  @Prop({ type: Number, default: null })
  token: number | null;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: Date, default: null })
  paymentDate: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
