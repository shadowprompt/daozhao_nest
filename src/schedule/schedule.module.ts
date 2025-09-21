import { DynamicModule, Module } from "@nestjs/common";
import { ScheduleControllerMaker } from "./schedule.controller";
import { UpdateListService } from '../common/service/storage/updateList.service';
import { VersionService } from '../common/service/storage/version.service';
import { ScheduleService } from "./schedule.service";
import { ScheduleFactoryService } from "./scheduleFactory.service";
import { ScheduleHandlerFactoryService } from "./scheduleHandlerFactory.service";
import { AccessTokenFactoryService } from './access_token/accessTokenFactory.service';
import { scheduleStorageDto } from "./dto/schedule.dto";

import { WeixinController } from './access_token/weixin.controller';
import { WeixinService } from './access_token/weixin.service';

import { weixinFitconverterController } from './access_token/weixinFitconverter/weixinFitconverterController';
import { weixinFitconverterService } from './access_token/weixinFitconverter/weixinFitconverterService';

import { wxminFitconverterController } from './access_token/wxminFitconverter/wxminFitconverterController';
import { wxminFitconverterService } from './access_token/wxminFitconverter/wxminFitconverterService';

import { HMSController } from './access_token/HMS.controller';
import { HMSService } from './access_token/HMS.service';

import { HMS_HIController } from './access_token/HMS_HI.controller';
import { HMS_HIService } from './access_token/HMS_HI.service';

import { HMS_webPushController } from './access_token/HMS_webPush.controller';
import { HMS_webPushService } from './access_token/HMS_webPush.service';

@Module({})
export class ScheduleModule {
  static register(options: Record<string, any>): DynamicModule {
    // 读取storage存储的schedule列表
    const updateListService = new UpdateListService();
    const list = updateListService.get(scheduleStorageDto);
    // 根据schedule列表生成controller列表
    const controllers = list.map(item => ScheduleControllerMaker(item));

    return {
      module: ScheduleModule,
      controllers: controllers.concat(weixinFitconverterController, wxminFitconverterController, WeixinController, HMSController, HMS_HIController, HMS_webPushController),
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
        WeixinService,
        weixinFitconverterService,
        wxminFitconverterService,
        HMSService,
        HMS_HIService,
        HMS_webPushService,
      ],
      exports: [
        VersionService,
        UpdateListService,
        ScheduleService,
        ScheduleFactoryService,
        ScheduleHandlerFactoryService,
        AccessTokenFactoryService,
        WeixinService,
        weixinFitconverterService,
        wxminFitconverterService,
        HMSService,
        HMS_HIService,
      ],
    };
  }
}
