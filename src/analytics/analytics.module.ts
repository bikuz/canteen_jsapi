import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Analytics,AnalyticsSchema } from './analytics.model';

@Module({
  imports:[MongooseModule.forFeature([{name:Analytics.name, schema:AnalyticsSchema}])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController]
})
export class AnalyticsModule {}
