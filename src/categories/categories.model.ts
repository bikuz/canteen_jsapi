import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,Types } from 'mongoose';

@Schema()
export class Category extends Document {
  @Prop({ required: true })
  name: string;

  @Prop() 
  image: string | null;

  @Prop({ default: true })
  isAvailable: boolean;
  
  @Prop({ default: Date.now })
  createdAt: Date;

}

export const CategorySchema = SchemaFactory.createForClass(Category);
