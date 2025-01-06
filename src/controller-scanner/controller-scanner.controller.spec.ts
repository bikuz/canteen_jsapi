import { Test, TestingModule } from '@nestjs/testing';
import { ControllerScannerController } from './controller-scanner.controller';

describe('ControllerScannerController', () => {
  let controller: ControllerScannerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ControllerScannerController],
    }).compile();

    controller = module.get<ControllerScannerController>(ControllerScannerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
