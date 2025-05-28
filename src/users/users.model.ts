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

  @Prop({ type: Object}) 
  profile: Profile;

  @Prop({ default: false, type: Boolean, nullable: true })
  isEmailVerified: boolean | null;

  @Prop()
  emailVerifiedAt: Date;

  @Prop()
  verificationToken: string;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordExpires: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
