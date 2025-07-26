import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import { weixinFitconverterService } from "./weixinFitconverterService";
import { AutoStart } from "../AutoStart";

@Controller('/weixinFitconverter')
export class weixinFitconverterController extends AutoStart {
  constructor(private readonly service: weixinFitconverterService) {
    super();
    this.scheduleInfo = this.service.make();
  }
  @Post()
  async set(@Body() body) {
    return this.service.scheduleInfo.requestHandler(body);
  }
  // 获取当前schedule的下次触发时间
  @Get('/list')
  async get(@Query() query) {
    const scheduleJobInstance = this.service.scheduleInfo.scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

}
