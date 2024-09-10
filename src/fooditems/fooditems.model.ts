import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class FoodItem extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category: Types.ObjectId;

  @Prop({ required: true, enum: ['single', 'combo' , 'buffet'] })
  type: string; // 'single', 'combo' , 'Buffet'

  @Prop({ type: [{ type: Types.ObjectId, ref: 'FoodItem' }] })
  comboItems: Types.ObjectId[]; // Array of FoodItem IDs for combo offers

  @Prop({ required: true })
  filename: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const FoodItemSchema = SchemaFactory.createForClass(FoodItem);
