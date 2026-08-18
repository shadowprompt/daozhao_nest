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

  @Get('/harmony/apps')
  getHarmonyApps() {
    return this.appGalleryService.getHarmonyWatchedApps();
  }

  @Post('/apps')
  updateApps(@Body() body: { list: AppGalleryWatchedAppDto[] }) {
    return this.appGalleryService.updateWatchedApps(body.list || []);
  }

  @Post('/harmony/apps')
  updateHarmonyApps(@Body() body: { list: AppGalleryWatchedAppDto[] }) {
    return this.appGalleryService.updateHarmonyWatchedApps(body.list || []);
  }

  @Post('/apps/add')
  addApp(@Body() body: AppGalleryWatchedAppDto) {
    return this.appGalleryService.addWatchedApp(body);
  }

  @Post('/harmony/apps/add')
  addHarmonyApp(@Body() body: AppGalleryWatchedAppDto) {
    return this.appGalleryService.addHarmonyWatchedApp(body);
  }

  @Post('/apps/remove')
  removeApp(@Body() body: { packageName: string }) {
    return this.appGalleryService.removeWatchedApp(body.packageName);
  }

  @Post('/harmony/apps/remove')
  removeHarmonyApp(@Body() body: { packageName: string }) {
    return this.appGalleryService.removeHarmonyWatchedApp(body.packageName);
  }

  @Get('/search')
  searchApps(@Query('keyword') keyword: string) {
    return this.appGalleryService.searchApps(keyword);
  }

  @Get('/harmony/search')
  searchHarmonyApps(@Query('keyword') keyword: string) {
    return this.appGalleryService.searchHarmonyApps(keyword);
  }

  @Get('/apps/:packageName/watched')
  isWatched(@Param('packageName') packageName: string) {
    return this.appGalleryService.isWatched(packageName);
  }

  @Get('/harmony/apps/:packageName/watched')
  isHarmonyWatched(@Param('packageName') packageName: string) {
    return this.appGalleryService.isHarmonyWatched(packageName);
  }

  @Post('/scan')
  scan(@Body() body) {
    return this.appGalleryService.scan(body || {});
  }

  @Post('/harmony/scan')
  scanHarmony(@Body() body) {
    return this.appGalleryService.scanHarmony(body || {});
  }

  @Get('/versions')
  getLastScanResult() {
    return this.appGalleryService.getLastScanResult();
  }

  @Get('/harmony/versions')
  getHarmonyLastScanResult() {
    return this.appGalleryService.getHarmonyLastScanResult();
  }

  @Get('/notifications')
  getNotificationStatus() {
    return this.appGalleryService.getNotificationStatus();
  }

  @Get('/harmony/notifications')
  getHarmonyNotificationStatus() {
    return this.appGalleryService.getHarmonyNotificationStatus();
  }

  @Post('/notifications/retry')
  retryNotifications() {
    return this.appGalleryService.retryNotifications();
  }

  @Post('/harmony/notifications/retry')
  retryHarmonyNotifications() {
    return this.appGalleryService.retryHarmonyNotifications();
  }

  @Get('/apps/:packageName/version')
  getAppVersion(@Param('packageName') packageName: string) {
    return this.appGalleryService.getAppVersion(packageName);
  }

  @Get('/harmony/apps/:packageName/version')
  getHarmonyAppVersion(@Param('packageName') packageName: string) {
    return this.appGalleryService.getHarmonyAppVersion(packageName);
  }

  // 获取AppGallery版本扫描的下次触发时间
  @Get('/list')
  getNextUpdateTime() {
    return {
      nextUpdateTime: this.appGalleryService.getNextUpdateTime(),
    };
  }

  @Get('/harmony/list')
  getHarmonyNextUpdateTime() {
    return {
      nextUpdateTime: this.appGalleryService.getHarmonyNextUpdateTime(),
    };
  }

  // 停止AppGallery版本扫描定时任务
  @Get('/stop')
  stop() {
    return {
      isCancelled: this.appGalleryService.stop(),
    };
  }

  @Get('/harmony/stop')
  stopHarmony() {
    return {
      isCancelled: this.appGalleryService.stopHarmony(),
    };
  }
}
