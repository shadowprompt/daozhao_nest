import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AppGalleryService } from "./appgallery.service";
import { AppGalleryWatchedAppDto } from "./appgallery.dto";

@Controller('/appgallery')
export class AppGalleryController {
  constructor(private readonly appGalleryService: AppGalleryService) {}

  @Get('/apps')
  getApps() {
    return this.appGalleryService.getWatchedApps();
  }

  @Post('/apps')
  updateApps(@Body() body: { list: AppGalleryWatchedAppDto[] }) {
    return this.appGalleryService.updateWatchedApps(body.list || []);
  }

  @Get('/search')
  searchApps(@Query('keyword') keyword: string) {
    return this.appGalleryService.searchApps(keyword);
  }

  @Get('/apps/:packageName/watched')
  isWatched(@Param('packageName') packageName: string) {
    return this.appGalleryService.isWatched(packageName);
  }

  @Post('/scan')
  scan(@Body() body) {
    return this.appGalleryService.scan(body || {});
  }

  @Get('/versions')
  getLastScanResult() {
    return this.appGalleryService.getLastScanResult();
  }

  @Get('/apps/:packageName/version')
  getAppVersion(@Param('packageName') packageName: string) {
    return this.appGalleryService.getAppVersion(packageName);
  }

  // 获取AppGallery版本扫描的下次触发时间
  @Get('/list')
  getNextUpdateTime() {
    return {
      nextUpdateTime: this.appGalleryService.getNextUpdateTime(),
    };
  }

  // 停止AppGallery版本扫描定时任务
  @Get('/stop')
  stop() {
    return {
      isCancelled: this.appGalleryService.stop(),
    };
  }
}
