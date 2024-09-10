import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';

@Schema()
export class Payment extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  orderId: string;
  
  @Prop({ required: true, enum: ['cash', 'esewa','khalti'] })
  paymentMethod: string; // 'cash', 'eSewa', 'Khalti', 'fonepay'

  @Prop({ required: true })
  amount: number;

  @Prop({ default: Date.now })
  paymentDate: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
