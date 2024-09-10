import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Analytics extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'FoodItem', required: true })
  itemId: Types.ObjectId;

  @Prop({ type: String, enum: ['view', 'order', 'cancel', 'payment'], required: true })
  eventType: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  itemCategory: Types.ObjectId;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String })
  paymentMethod: string;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics);
