import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Role extends Document {
  @Prop({ required: true, unique: true })
  name: string; // 'admin', 'manager', 'kitchen_staff', 'customer'

  @Prop({ type: Map, of: Map, default: {} })
  permissions: Map<string, Map<string, boolean>>; // e.g., { 'controller1': { 'action1': true, 'action2': false }, 'controller2': { 'action1': true } }

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
