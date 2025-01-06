import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Profile } from './profile.interface';
import { Role } from '../role/role.model';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [Types.ObjectId], ref: 'Role' })
  roles:Role[]|null;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: Object }) // Define the profile as an embedded object with a type
  profile: Profile;

  //future update
  // isEnabled: boolean;
  // isLocked: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
