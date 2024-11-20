import { Test, TestingModule } from '@nestjs/testing';
import { OrdertimeframeService } from './ordertimeframe.service';

describe('OrdertimeframeService', () => {
  let service: OrdertimeframeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdertimeframeService],
    }).compile();

    service = module.get<OrdertimeframeService>(OrdertimeframeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
