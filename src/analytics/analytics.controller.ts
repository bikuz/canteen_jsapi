import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  async create(@Body() createAnalyticsDto: any) {
    return this.analyticsService.create(createAnalyticsDto);
  }

  @Get()
  async findAll() {
    return this.analyticsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.analyticsService.findById(id);
  }

  @Get('popular-items')
  async getPopularItems() {
    const pipeline = [
      { $match: { eventType: 'order' } },
      { $group: { _id: '$itemId', totalSold: { $sum: '$quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ];
    return this.analyticsService.aggregate(pipeline);
  }

  @Get('sales-trends')
  async getSalesTrends(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const pipeline = [
      { $match: { eventType: 'order', timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, dailyRevenue: { $sum: { $multiply: ['$price', '$quantity'] } } } },
      { $sort: { _id: 1 } }
    ];
    return this.analyticsService.aggregate(pipeline);
  }

  // Add more endpoints as needed for analytics
}
