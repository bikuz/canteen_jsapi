import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Profile } from './profile.interface';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId; // Reference to Role model

  // @Prop()
  // favoriteMenus: string[]; // Array of Menu IDs

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: Object }) // Define the profile as an embedded object with a type
  profile: Profile;
}

export const UserSchema = SchemaFactory.createForClass(User);
