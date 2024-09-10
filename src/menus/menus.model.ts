import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Menu extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'FoodItem' }] })
  foodItems: Types.ObjectId[]; // Array of FoodItem IDs

  @Prop({ required: true, enum: ['daily', 'weekly'] })
  type: string; // 'daily' or 'weekly'

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MenuSchema = SchemaFactory.createForClass(Menu);
