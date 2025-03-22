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

  @Prop({ required: true })
  firstname: string;

  @Prop({ required: true })
  lastname: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: [Types.ObjectId], ref: 'Role' })
  roles: Role[] | null;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({
    type: {
      firstName: String,
      lastName: String,
      email: String,
      phoneNumber: String
    }
  })
  profile: Profile;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerifiedAt: Date;

  @Prop()
  verificationToken: string;

  //future update
  // isEnabled: boolean;
  // isLocked: boolean;
  resetPasswordToken: string;
  resetPasswordExpires: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
