import { Controller, Get, Query } from "@nestjs/common";
import { HMS_webPushService } from "./HMS_webPush.service";

@Controller('/HMS_webPush')
export class HMS_webPushController {
  private scheduleInfo: { setSchedule: any; scheduleJobInstance: any; requestHandler: (requestBody) => any; label: any };
  constructor(private readonly hms_webPushService: HMS_webPushService) {
    this.scheduleInfo = this.hms_webPushService.make();
  }
  @Get()
  async set(@Query() query) {
    return this.scheduleInfo.requestHandler({
      isDirect: true,
    });
  }
  // 获取当前schedule的下次触发时间
  @Get('/list')
  async get(@Query() query) {
    const scheduleJobInstance = this.scheduleInfo.scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

}
