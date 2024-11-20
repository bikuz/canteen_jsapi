import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Discount extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0, max: 100 })
  discountPercent: number;

  @Prop({ required: true })
  validFrom: Date;

  @Prop({ required: true })
  validTo: Date;

  @Prop({ type: [Types.ObjectId], ref: 'FoodItem', default: [] })
  applicableFoodItems?: Types.ObjectId[]; // Optional: Apply to specific food items

  @Prop({ type: [Types.ObjectId], ref: 'Category', default: [] })
  applicableCategories?: Types.ObjectId[]; // Optional: Apply to specific categories

  @Prop() 
  image: string | null;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);