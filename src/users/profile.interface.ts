// profile.interface.ts
import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class Profile {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  email: string;

  @Prop()
  phoneNumber: string;
}
