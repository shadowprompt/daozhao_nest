import { Controller, Get, Query, Body, Post } from "@nestjs/common";
import { HMS_HIService } from "./HMS_HI.service";
import { AutoStart } from "./AutoStart";

@Controller('/HMS_HI')
export class HMS_HIController extends AutoStart {
  constructor(private readonly hms_hiService: HMS_HIService) {
    super();
    this.scheduleInfo = this.hms_hiService.make();
  }
  @Post()
  async set(@Body() body) {
    return this.hms_hiService.scheduleInfo.requestHandler(body);
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
