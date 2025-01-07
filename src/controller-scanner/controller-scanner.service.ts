import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

@Injectable()
export class ControllerScannerService {
    private readonly logger = new Logger(ControllerScannerService.name);
    private readonly ignoreControllers: string[];
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.ignoreControllers = this.configService.get<string[]>('ignoreControllers') || [];
  }

  listControllersAndActions() {
    const controllers = this.discoveryService
      .getControllers()
      .map((wrapper) => wrapper.instance)
      .filter((instance) => instance);

    const controllerData = controllers.map((controller) => {
      const prototype = Object.getPrototypeOf(controller);
      const methods = this.metadataScanner.getAllMethodNames(prototype);

      if (this.ignoreControllers.includes(controller.constructor.name)) {
        return null;
      }

      const controllerRoles = this.reflector.get('roles', controller.constructor) || [];
      
      // if (controllerRoles.includes('super-admin') || controllerRoles.includes('*')) {
      //   return null;
      // }
      if (controllerRoles.includes('super-admin')) {
        return null;
      }

      return {
        controller: controller.constructor.name.replace('Controller', ''),
        actions: methods.filter((methodName) => {
          if (typeof prototype[methodName] !== 'function' || methodName === 'constructor') {
            return false;
          }

          const methodRoles = this.reflector.get('roles', prototype[methodName]) || [];
          
          // return !methodRoles.includes('super-admin') && !methodRoles.includes('*');
          return !methodRoles.includes('super-admin') ;
        }),
      };
    })
    .filter(data => data !== null && data.actions.length > 0)
    .sort((a, b) => a.controller.localeCompare(b.controller));

    return controllerData;
  }

  logControllersAndActions() {
    const controllerData = this.listControllersAndActions();
    controllerData.forEach(({ controller, actions }) => {
      this.logger.log(`Controller: ${controller}`);
      actions.forEach((action) => {
        this.logger.log(`  Action: ${action}`);
      });
    });
  }
}
