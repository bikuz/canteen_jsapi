import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FoodItem } from '../fooditems/fooditems.model';

@Schema()
export class Menu extends Document {
  @Prop({ required: true })
  name: string;

  // @Prop({ type: [{ type: Types.ObjectId, ref: 'FoodItem' }] })
  // foodItems: Types.ObjectId[]; // Array of FoodItem IDs

  @Prop({ type: [Types.ObjectId], ref: 'FoodItem', required: true })
  foodItems: FoodItem[];

  @Prop({ required: true })
  date: Date;

  @Prop({ enum: ['Daily', 'Weekly', 'Monthly'], default: 'Daily' })
  scheduleType: string;

  @Prop() 
  image: string | null;

  @Prop({ default: true })
  isAvailable: boolean;

  // Array of strings for tags like "kids-friendly", "Family-pack", "Jumbo-Pack"
  @Prop({ type: [String], default: null }) 
  tags: string[] | null;

  @Prop({ default: Date.now })
  createdAt: Date;

  // @Prop({ type: Types.ObjectId, ref: 'OrderTimeFrame' })
  // orderingTimeframe?:  Types.ObjectId;
}

export const MenuSchema = SchemaFactory.createForClass(Menu);
