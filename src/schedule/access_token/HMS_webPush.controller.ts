import { Controller, Get, Query } from "@nestjs/common";
import { HMS_webPushService } from "./HMS_webPush.service";
import { AutoStart } from "./AutoStart";

@Controller('/HMS_webPush')
export class HMS_webPushController extends AutoStart {
  constructor(private readonly hms_webPushService: HMS_webPushService) {
    super();
    this.scheduleInfo = this.hms_webPushService.make();

  }
  @Get()
  async set(@Query() query) {
    return this.hms_webPushService.scheduleInfo.requestHandler(query);
  }
  // 获取当前schedule的下次触发时间
  @Get('/list')
  async get(@Query() query) {
    const scheduleJobInstance = this.hms_webPushService.scheduleInfo.scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

}
