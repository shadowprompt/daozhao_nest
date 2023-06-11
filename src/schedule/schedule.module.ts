import { DynamicModule, Module } from "@nestjs/common";
import { ScheduleControllerMaker } from "./schedule.controller";
import { UpdateListService } from '../common/service/storage/updateList.service';
import { VersionService } from '../common/service/storage/version.service';
import { ScheduleService } from "./schedule.service";
import { ScheduleFactoryService } from "./scheduleFactory.service";
import { ScheduleHandlerFactoryService } from "./scheduleHandlerFactory.service";
import { scheduleStorageDto } from "./dto/schedule.dto";

@Module({})
export class ScheduleModule {
  static register(options: Record<string, any>): DynamicModule {
    const updateListService = new UpdateListService();
    const list = updateListService.get(scheduleStorageDto);
    // 生成controller列表
    const controllers = list.map(item => ScheduleControllerMaker(item));

    return {
      module: ScheduleModule,
      controllers: controllers,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        VersionService,
        UpdateListService,
        ScheduleService,
        ScheduleFactoryService,
        ScheduleHandlerFactoryService
      ],
      exports: [VersionService, UpdateListService, ScheduleService, ScheduleFactoryService, ScheduleHandlerFactoryService],
    };
  }
}
