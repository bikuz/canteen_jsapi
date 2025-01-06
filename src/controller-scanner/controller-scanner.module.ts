import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { DiscoveryService } from '@nestjs/core/discovery';
import { ControllerScannerService } from './controller-scanner.service';
import { ControllerScannerController } from './controller-scanner.controller';
import { RoleModule } from '../role/role.module';
import { UserModule } from '../users/users.module';

@Module({
    imports: [
        DiscoveryModule,
        RoleModule,
        UserModule
    ],
    providers: [ControllerScannerService, DiscoveryService],
    controllers: [ControllerScannerController],
    exports: [ControllerScannerService],
})
export class ControllerScannerModule {}


