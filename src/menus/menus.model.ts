import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FoodItem } from '../fooditems/fooditems.model';
// import { FoodItem } from '../fooditems/fooditems.model';

@Schema()
export class Menu extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [Types.ObjectId], ref: 'FoodItem' })
  foodItems:FoodItem[]|null;
  // foodItems: Types.ObjectId[] | null;

  @Prop({ type: [String]})
  repeatDay: string[]; // Sunday,Monday,Tuesday ...... Saturday

  @Prop({ default: true })
  isAvailable?: boolean;

  // Array of strings for tags like "kids-friendly", "Family-pack", "Jumbo-Pack"
  @Prop({ type: [String], default: null }) 
  tags: string[] | null;

  @Prop({ default: Date.now })
  createdAt: Date;

}

export const MenuSchema = SchemaFactory.createForClass(Menu);
