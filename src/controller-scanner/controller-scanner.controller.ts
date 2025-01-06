import { Controller,Get, UseGuards } from '@nestjs/common';

import { ControllerScannerService } from './controller-scanner.service';
import { JwtAuthGuard } from '../authjwt/jwt-auth.guard';
import { Roles } from '../helper/roles.decorator';
import { DynamicRolesGuard } from '../helper/dynamic-auth.guard';

@Controller('controller-scanner')
@UseGuards(JwtAuthGuard, DynamicRolesGuard)
@Roles('super-admin')
export class ControllerScannerController {
    constructor(private readonly controllerScannerService: ControllerScannerService) {}

    @Get()
    listControllersAndActions() {
        return this.controllerScannerService.listControllersAndActions();
    }
}
