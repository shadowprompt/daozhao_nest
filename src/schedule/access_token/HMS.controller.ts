import { Controller, Get, Query } from "@nestjs/common";
import { HMSService } from "./HMS.service";

@Controller('/HMS')
export class HMSController {
  constructor(private readonly hmsService: HMSService) {}
  @Get()
  async set(@Query() query) {
    return this.hmsService.scheduleInfo.requestHandler(query);
  }
  // 获取当前schedule的下次触发时间
  @Get('/list')
  async get(@Query() query) {
    const scheduleJobInstance = this.hmsService.scheduleInfo.scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

}
