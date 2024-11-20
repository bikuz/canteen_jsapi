import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class FoodItem extends Document {

  @Prop({ required: true })
  name: string;

  // e.g if 'Buffet', description can be 'Ceral Daal + Chicken + Potato curry + Rice'
  // e.g if 'Combo', description cane be 'Burger + Fries + Coke'
  @Prop() 
  description: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category: Types.ObjectId;

  @Prop({ required: true })
  price: number;

  @Prop() 
  image: string | null;

  @Prop({ default: true })
  isAvailable: boolean;

  // e.g Array of tags like 'Cuisine','Apitizer', 'Veg', 'Non-Veg', 'Vegan', 'gluten-free', 'sugar-free'
  @Prop({ type: [String], default: null }) 
  tags: string[] | null;

  @Prop({ default: Date.now })
  createdAt: Date;

  // @Prop({ type: Types.ObjectId, ref: 'OrderTimeFrame' })
  // orderingTimeframe?:  Types.ObjectId;
}

export const FoodItemSchema = SchemaFactory.createForClass(FoodItem);
