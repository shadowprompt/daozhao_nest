import { Controller, Get, Query } from "@nestjs/common";
import { HMS_HIService } from "./HMS_HI.service";

@Controller('/HMS_HI')
export class HMS_HIController {
  constructor(private readonly hms_hiService: HMS_HIService) {}
  @Get()
  async set(@Query() query) {
    return this.hms_hiService.scheduleInfo.requestHandler(query);
  }
  // 获取当前schedule的下次触发时间
  @Get('/list')
  async get(@Query() query) {
    const scheduleJobInstance = this.hms_hiService.scheduleInfo.scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

}