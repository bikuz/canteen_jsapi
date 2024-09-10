import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';

@Schema()
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'FoodItem', required: true }])
  foodItems: Types.ObjectId[];

  @Prop([{ type: Number, required: true }])
  quantities: number[];

  @Prop({ type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' })
  status: string;

  @Prop({ type: String })
  remarks: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop({ type: String })
  cancelReason: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
