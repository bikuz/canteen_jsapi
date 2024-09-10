import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Analytics } from './analytics.model';

@Injectable()
export class AnalyticsService {
  constructor(@InjectModel(Analytics.name) private analyticsModel: Model<Analytics>) {}

  async create(createAnalyticsDto: any): Promise<Analytics> {
    const createdAnalytics = new this.analyticsModel(createAnalyticsDto);
    return createdAnalytics.save();
  }

  async findAll(): Promise<Analytics[]> {
    return this.analyticsModel.find().exec();
  }

  async findById(id: string): Promise<Analytics> {
    return this.analyticsModel.findById(id).exec();
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.analyticsModel.aggregate(pipeline).exec();
  }

  // Add more methods as needed for handling analytics
}
