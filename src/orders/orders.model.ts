import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { FoodItem } from '../fooditems/fooditems.model';

@Schema()
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customer: Types.ObjectId;

  @Prop({ type: String, unique: true})
  shortId: string;

  // @Prop([{ type: Types.ObjectId, ref: 'FoodItem', required: true }])
  // foodItems: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'FoodItem', required: true})
  foodItems:FoodItem[]|null;
  
  @Prop([{ type: Number, required: true }])
  quantities: number[];

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: String, enum: ['created', 'processing', 'completed', 'cancelled'], default: 'created' })
  status: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;
  
  @Prop({ type: String, default: null })
  cancelReason: string | null;

}

export const OrderSchema = SchemaFactory.createForClass(Order);
