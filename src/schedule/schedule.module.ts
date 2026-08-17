import { DynamicModule, Module } from "@nestjs/common";
import { UpdateListService } from '../common/service/storage/updateList.service';
import { VersionService } from '../common/service/storage/version.service';
import { ScheduleService } from "./schedule.service";
import { ScheduleFactoryService } from "./scheduleFactory.service";
import { ScheduleHandlerFactoryService } from "./scheduleHandlerFactory.service";
import { AccessTokenFactoryService } from './access_token/accessTokenFactory.service';
import { ScheduleController } from "./schedule.controller";
import { AccessTokenController } from "./access_token/accessToken.controller";
import { AccessTokenRegistryService } from "./access_token/accessTokenRegistry.service";
import { AppGalleryController } from "./appgallery/appgallery.controller";
import { AppGalleryService } from "./appgallery/appgallery.service";

@Module({})
export class ScheduleModule {
  static register(options: Record<string, any>): DynamicModule {
    return {
      module: ScheduleModule,
      controllers: [ScheduleController, AccessTokenController, AppGalleryController],
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        VersionService,
        UpdateListService,
        ScheduleService,
        ScheduleFactoryService,
        ScheduleHandlerFactoryService,
        AccessTokenFactoryService,
        AccessTokenRegistryService,
        AppGalleryService,
      ],
      exports: [
        VersionService,
        UpdateListService,
        ScheduleService,
        ScheduleFactoryService,
        ScheduleHandlerFactoryService,
        AccessTokenFactoryService,
        AccessTokenRegistryService,
        AppGalleryService,
      ],
    };
  }
}
