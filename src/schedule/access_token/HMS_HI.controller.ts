import { Controller, Get, Query } from "@nestjs/common";
import { HMS_HIService } from "./HMS_HI.service";

@Controller('/HMS_HI')
export class HMS_HIController {
  private scheduleInfo: { setSchedule: any; scheduleJobInstance: any; requestHandler: (requestBody) => any; label: any };
  constructor(private readonly hms_hiService: HMS_HIService) {
    this.scheduleInfo = this.hms_hiService.make();
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
