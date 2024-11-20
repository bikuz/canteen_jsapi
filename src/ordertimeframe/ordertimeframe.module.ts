import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderTimeFrame, OrderTimeFrameSchema } from './ordertimeframe.model';
import { OrderTimeFrameController } from './ordertimeframe.controller';
import { OrderTimeFrameService } from './ordertimeframe.service';

@Module({
  imports:[MongooseModule.forFeature([
    {name:OrderTimeFrame.name, schema:OrderTimeFrameSchema},    
  ])],
  controllers: [OrderTimeFrameController],
  providers: [OrderTimeFrameService],
  exports: [OrderTimeFrameService,MongooseModule], // Export the service to make it available in other modules
})
export class OrderTimeFrameModule {}
