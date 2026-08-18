import { Injectable, OnModuleInit } from "@nestjs/common";
import { dLog } from '@daozhao/utils';
import { createHash } from "crypto";
import { StorageDto } from "../../common/dto/storage.dto";
import { axios, getLocalData, setLocalData } from "../../utils";
import { ScheduleFactoryService } from "../scheduleFactory.service";
import {
  AppGalleryAppVersionDto,
  AppGalleryNotificationOutboxItemDto,
  AppGalleryPlatformType,
  AppGalleryWatchedAppDto,
  AppGalleryVersionChangeDto,
  appGalleryHarmonyLastNotificationResultStorage,
  appGalleryHarmonyNotificationOutboxStorage,
  appGalleryHarmonyScanResultStorage,
  appGalleryHarmonyVersionSnapshotStorage,
  appGalleryHarmonyWatchedAppsStorage,
  appGalleryLastNotificationResultStorage,
  appGalleryNotificationOutboxStorage,
  appGalleryScanResultStorage,
  appGalleryVersionSnapshotStorage,
  appGalleryWatchedAppsStorage,
} from "./appgallery.dto";

const DEFAULT_APPGALLERY_APPINFO_URL = 'https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo';
const DEFAULT_APPGALLERY_SEARCH_URL = 'https://web-drcn.hispace.dbankcloud.com/edge/index/completeSearchWord';
const DEFAULT_ECHOQB_API_BASE_URL = 'http://localhost:8000';
const DEFAULT_ECHOQB_APP_KEY = 'appgallery-monitor';
const DEFAULT_ECHOQB_CHANNEL_KEY = 'app-version-updates';
const DEFAULT_APPGALLERY_NOTIFY_TTL_SECONDS = 86400;

type AppGalleryPlatformConfig = {
  platform: AppGalleryPlatformType;
  watchedAppsStorage: StorageDto;
  versionSnapshotStorage: StorageDto;
  scanResultStorage: StorageDto;
  notificationOutboxStorage: StorageDto;
  lastNotificationResultStorage: StorageDto;
  getScheduleMinutes: () => number;
  scheduleKey: string;
  notifyIdPrefix: string;
  idempotencyPrefix: string;
  notificationTitle: string;
  payloadType: string;
  logLabel: string;
};

const APPGALLERY_PLATFORM_CONFIGS: Record<AppGalleryPlatformType, AppGalleryPlatformConfig> = {
  android: {
    platform: 'android',
    watchedAppsStorage: appGalleryWatchedAppsStorage,
    versionSnapshotStorage: appGalleryVersionSnapshotStorage,
    scanResultStorage: appGalleryScanResultStorage,
    notificationOutboxStorage: appGalleryNotificationOutboxStorage,
    lastNotificationResultStorage: appGalleryLastNotificationResultStorage,
    getScheduleMinutes: () => parseInt(process.env.APPGALLERY_SCAN_MINUTES || '360'),
    scheduleKey: 'versionScanner',
    notifyIdPrefix: 'appgallery-notify',
    idempotencyPrefix: 'appgallery-version',
    notificationTitle: 'AppGallery Android 应用版本更新',
    payloadType: 'scanner.appgallery.version_changed',
    logLabel: 'AppGallery Android',
  },
  harmony: {
    platform: 'harmony',
    watchedAppsStorage: appGalleryHarmonyWatchedAppsStorage,
    versionSnapshotStorage: appGalleryHarmonyVersionSnapshotStorage,
    scanResultStorage: appGalleryHarmonyScanResultStorage,
    notificationOutboxStorage: appGalleryHarmonyNotificationOutboxStorage,
    lastNotificationResultStorage: appGalleryHarmonyLastNotificationResultStorage,
    getScheduleMinutes: () => parseInt(process.env.APPGALLERY_HARMONY_SCAN_MINUTES || process.env.APPGALLERY_SCAN_MINUTES || '360'),
    scheduleKey: 'harmonyVersionScanner',
    notifyIdPrefix: 'appgallery-harmony-notify',
    idempotencyPrefix: 'appgallery-harmony-version',
    notificationTitle: 'AppGallery 鸿蒙应用版本更新',
    payloadType: 'scanner.appgallery.harmony_version_changed',
    logLabel: 'AppGallery HarmonyOS',
  },
};

@Injectable()
export class AppGalleryService implements OnModuleInit {
  private scheduleJobInstance;
  private harmonyScheduleJobInstance;

  constructor(private readonly scheduleFactoryService: ScheduleFactoryService) {
    this.scheduleJobInstance = this.makeScheduleJob('android');
    this.harmonyScheduleJobInstance = this.makeScheduleJob('harmony');
  }

  onModuleInit() {
    Promise.resolve().then(async () => {
      await this.scan({ isStartup: true });
      await this.scanHarmony({ isStartup: true });
    }).catch(err => {
      console.log('appgallery scanner auto start error -> ', err.message);
    });
  }

  getWatchedApps(): AppGalleryWatchedAppDto[] {
    return this.getWatchedAppsByPlatform('android');
  }

  getHarmonyWatchedApps(): AppGalleryWatchedAppDto[] {
    return this.getWatchedAppsByPlatform('harmony');
  }

  updateWatchedApps(list: AppGalleryWatchedAppDto[]) {
    return this.updateWatchedAppsByPlatform('android', list);
  }

  updateHarmonyWatchedApps(list: AppGalleryWatchedAppDto[]) {
    return this.updateWatchedAppsByPlatform('harmony', list);
  }

  addWatchedApp(app: AppGalleryWatchedAppDto) {
    return this.addWatchedAppByPlatform('android', app);
  }

  addHarmonyWatchedApp(app: AppGalleryWatchedAppDto) {
    return this.addWatchedAppByPlatform('harmony', app);
  }

  removeWatchedApp(packageName: string) {
    return this.removeWatchedAppByPlatform('android', packageName);
  }

  removeHarmonyWatchedApp(packageName: string) {
    return this.removeWatchedAppByPlatform('harmony', packageName);
  }

  isWatched(packageName: string) {
    return this.isWatchedByPlatform('android', packageName);
  }

  isHarmonyWatched(packageName: string) {
    return this.isWatchedByPlatform('harmony', packageName);
  }

  searchApps(keyword: string) {
    return this.searchAppsByPlatform('android', keyword);
  }

  searchHarmonyApps(keyword: string) {
    return this.searchAppsByPlatform('harmony', keyword);
  }

  getLastScanResult() {
    return getLocalData(APPGALLERY_PLATFORM_CONFIGS.android.scanResultStorage);
  }

  getHarmonyLastScanResult() {
    return getLocalData(APPGALLERY_PLATFORM_CONFIGS.harmony.scanResultStorage);
  }

  getNotificationStatus() {
    return this.getNotificationStatusByPlatform('android');
  }

  getHarmonyNotificationStatus() {
    return this.getNotificationStatusByPlatform('harmony');
  }

  getAppVersion(packageName: string) {
    return this.getAppVersionByPlatform('android', packageName);
  }

  getHarmonyAppVersion(packageName: string) {
    return this.getAppVersionByPlatform('harmony', packageName);
  }

  getNextUpdateTime() {
    return this.getNextUpdateTimeByPlatform('android');
  }

  getHarmonyNextUpdateTime() {
    return this.getNextUpdateTimeByPlatform('harmony');
  }

  stop() {
    return this.scheduleJobInstance.cancelSchedule();
  }

  stopHarmony() {
    return this.harmonyScheduleJobInstance.cancelSchedule();
  }

  scan(options: any = {}) {
    return this.scanByPlatform('android', options);
  }

  scanHarmony(options: any = {}) {
    return this.scanByPlatform('harmony', options);
  }

  retryNotifications() {
    return this.retryNotificationsByPlatform('android');
  }

  retryHarmonyNotifications() {
    return this.retryNotificationsByPlatform('harmony');
  }

  private makeScheduleJob(platform: AppGalleryPlatformType) {
    const config = this.getPlatformConfig(platform);
    const { setSchedule, scheduleJobInstance, cancelSchedule } = this.scheduleFactoryService.make({
      type: 'appgallery',
      key: config.scheduleKey,
      scheduleMinutes: config.getScheduleMinutes(),
    }, () => this.scanByPlatform(platform, { isSchedule: true, skipSetSchedule: true }));

    return {
      setSchedule,
      getInstance: scheduleJobInstance.getInstance,
      cancelSchedule,
    };
  }

  private getWatchedAppsByPlatform(platform: AppGalleryPlatformType): AppGalleryWatchedAppDto[] {
    return getLocalData(this.getPlatformConfig(platform).watchedAppsStorage);
  }

  private updateWatchedAppsByPlatform(platform: AppGalleryPlatformType, list: AppGalleryWatchedAppDto[]) {
    const config = this.getPlatformConfig(platform);
    const normalizedList = list
      .filter(item => item && item.packageName)
      .map(item => ({
        packageName: item.packageName.trim(),
        name: item.name,
      }));

    setLocalData(config.watchedAppsStorage, normalizedList);
    return normalizedList;
  }

  private addWatchedAppByPlatform(platform: AppGalleryPlatformType, app: AppGalleryWatchedAppDto) {
    const config = this.getPlatformConfig(platform);
    const packageName = app && app.packageName && app.packageName.trim();
    if (!packageName) {
      throw new Error('packageName is required');
    }

    const list = this.getWatchedAppsByPlatform(platform);
    const targetIndex = list.findIndex(item => item.packageName === packageName);
    const normalizedApp = {
      packageName,
      name: app.name,
    };

    if (targetIndex >= 0) {
      list[targetIndex] = {
        ...list[targetIndex],
        ...normalizedApp,
      };
    } else {
      list.push(normalizedApp);
    }

    setLocalData(config.watchedAppsStorage, list);
    return {
      app: normalizedApp,
      list,
      isNew: targetIndex < 0,
      platform,
    };
  }

  private removeWatchedAppByPlatform(platform: AppGalleryPlatformType, packageName: string) {
    const config = this.getPlatformConfig(platform);
    const list = this.getWatchedAppsByPlatform(platform);
    const newList = list.filter(item => item.packageName !== packageName);

    setLocalData(config.watchedAppsStorage, newList);
    return {
      packageName,
      isRemoved: newList.length !== list.length,
      list: newList,
      platform,
    };
  }

  private isWatchedByPlatform(platform: AppGalleryPlatformType, packageName: string) {
    const target = this.getWatchedAppsByPlatform(platform).find(item => item.packageName === packageName);

    return {
      packageName,
      isWatched: !!target,
      app: target || null,
      platform,
    };
  }

  private async searchAppsByPlatform(platform: AppGalleryPlatformType, keyword: string) {
    const res = await axios.post(this.getSearchUrl(), {
      serviceType: 20,
      keyword,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = res.data || {};

    if (data.rtnCode && data.rtnCode !== 0) {
      throw new Error(data.rtnDesc || `AppGallery搜索接口返回异常：${data.rtnCode}`);
    }

    const rawApps = [];
    if (data.app) {
      rawApps.push(data.app);
    }
    if (Array.isArray(data.appList)) {
      rawApps.push(...data.appList);
    }

    const watchedPackageNames = new Set(this.getWatchedAppsByPlatform(platform).map(item => item.packageName));
    const duplicatePackageNames = new Set();
    const apps = rawApps
      .map(item => this.normalizeSearchApp(item))
      .filter(item => {
        if (!item.packageName || duplicatePackageNames.has(item.packageName)) {
          return false;
        }
        duplicatePackageNames.add(item.packageName);
        return true;
      })
      .map(item => ({
        ...item,
        isWatched: watchedPackageNames.has(item.packageName),
        platform,
      }));

    return {
      keyword,
      suggestions: data.list || [],
      apps,
      platform,
    };
  }

  private getNotificationStatusByPlatform(platform: AppGalleryPlatformType) {
    const config = this.getPlatformConfig(platform);
    return {
      enabled: this.isNotificationEnabled(),
      configured: this.isNotificationConfigured(),
      outbox: getLocalData(config.notificationOutboxStorage),
      lastResult: getLocalData(config.lastNotificationResultStorage),
      platform,
    };
  }

  private async getAppVersionByPlatform(platform: AppGalleryPlatformType, packageName: string) {
    const config = this.getPlatformConfig(platform);
    const snapshot = getLocalData(config.versionSnapshotStorage);
    const watchedApps = this.getWatchedAppsByPlatform(platform);
    const watchedApp = watchedApps.find(item => item.packageName === packageName) || { packageName };
    const cachedVersion = snapshot[packageName];

    if (cachedVersion) {
      return {
        ...cachedVersion,
        platform,
        _source: 'local snapshot',
      };
    }

    return {
      ...await this.fetchAppInfo(watchedApp, platform),
      _source: 'appgallery',
    };
  }

  private getNextUpdateTimeByPlatform(platform: AppGalleryPlatformType) {
    const instance = platform === 'harmony'
      ? this.harmonyScheduleJobInstance.getInstance()
      : this.scheduleJobInstance.getInstance();
    return instance && instance.nextInvocation() || 0;
  }

  private async scanByPlatform(platform: AppGalleryPlatformType, options: any = {}) {
    const config = this.getPlatformConfig(platform);
    const watchedApps = this.getWatchedAppsByPlatform(platform);
    const previousSnapshot = getLocalData(config.versionSnapshotStorage);
    const nextSnapshot = {};
    const changed: AppGalleryVersionChangeDto[] = [];
    const unchanged = [];
    const failed = [];

    for (const watchedApp of watchedApps) {
      try {
        const appInfo = await this.fetchAppInfo(watchedApp, platform);
        const oldInfo = previousSnapshot[watchedApp.packageName];
        nextSnapshot[watchedApp.packageName] = appInfo;

        if (!oldInfo) {
          unchanged.push({
            ...appInfo,
            isBaseline: true,
          });
        } else if (oldInfo.version !== appInfo.version || oldInfo.versionCode !== appInfo.versionCode) {
          changed.push({
            packageName: watchedApp.packageName,
            name: appInfo.name,
            platform,
            oldVersion: oldInfo.version,
            oldVersionCode: oldInfo.versionCode,
            newVersion: appInfo.version,
            newVersionCode: appInfo.versionCode,
            detailUrl: appInfo.detailUrl,
            updatedAt: appInfo.updatedAt,
          });
        } else {
          unchanged.push(appInfo);
        }
      } catch (err) {
        failed.push({
          packageName: watchedApp.packageName,
          name: watchedApp.name,
          platform,
          errMsg: err.message,
        });
      }
    }

    const result = {
      success: failed.length === 0,
      scannedAt: Date.now(),
      total: watchedApps.length,
      changed,
      unchanged,
      failed,
      isStartup: !!options.isStartup,
      isSchedule: !!options.isSchedule,
      platform,
    };

    setLocalData(config.versionSnapshotStorage, {
      ...previousSnapshot,
      ...nextSnapshot,
    });
    setLocalData(config.scanResultStorage, result);
    // 快照先落盘，通知失败时依赖 outbox 后续补发，避免扫描结果被回滚。
    await this.enqueueChangedNotifications(platform, result.changed, result.scannedAt);
    await this.retryNotificationsByPlatform(platform);
    if (!options.skipSetSchedule) {
      const scheduleJobInstance = platform === 'harmony' ? this.harmonyScheduleJobInstance : this.scheduleJobInstance;
      scheduleJobInstance.setSchedule(config.getScheduleMinutes());
    }

    dLog(`${config.logLabel}版本扫描完成，更新${changed.length}个，失败${failed.length}个`);
    return {
      ...result,
      nextUpdateTime: this.getNextUpdateTimeByPlatform(platform),
    };
  }

  private async retryNotificationsByPlatform(platform: AppGalleryPlatformType) {
    const config = this.getPlatformConfig(platform);
    if (!this.isNotificationEnabled()) {
      return this.recordNotificationResult(config, {
        success: true,
        skipped: true,
        reason: 'ECHOQB_NOTIFY_ENABLED is not true',
        checkedAt: Date.now(),
        platform,
      });
    }

    if (!this.isNotificationConfigured()) {
      return this.recordNotificationResult(config, {
        success: false,
        skipped: true,
        reason: 'ECHOQB_APP_API_KEY is required',
        checkedAt: Date.now(),
        platform,
      });
    }

    const outbox = this.getNotificationOutbox(config);
    const results = [];

    for (const item of outbox.filter(it => it.status !== 'sent')) {
      results.push(await this.sendNotificationItem(config, item));
    }

    const result = {
      success: results.every(item => item.success),
      total: results.length,
      results,
      checkedAt: Date.now(),
      platform,
    };
    return this.recordNotificationResult(config, result);
  }

  private async fetchAppInfo(watchedApp: AppGalleryWatchedAppDto, platform: AppGalleryPlatformType): Promise<AppGalleryAppVersionDto> {
    const res = await axios.post(this.getAppInfoUrl(), {
      pkgName: watchedApp.packageName,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = res.data || {};

    if (data.rtnCode && data.rtnCode !== 0) {
      throw new Error(data.rtnDesc || `AppGallery接口返回异常：${data.rtnCode}`);
    }

    if (!data.version && !data.versionCode) {
      throw new Error('AppGallery接口未返回版本信息');
    }

    return {
      appId: data.appId,
      packageName: data.pkgName || watchedApp.packageName,
      name: data.name || watchedApp.name || watchedApp.packageName,
      platform,
      version: data.version,
      versionCode: data.versionCode,
      developerName: data.developerName,
      detailUrl: `https://appgallery.huawei.com/app/${data.appId}`,
      updatedAt: Date.now(),
    };
  }

  private normalizeSearchApp(item) {
    const appId = item.id || item.appId;

    return {
      appId,
      packageName: item.package || item.pkgName,
      name: item.name,
      version: item.version || item.appVersionName,
      versionCode: item.versionCode,
      kindName: item.kindName,
      memo: item.memo || item.intro,
      detailUrl: appId ? `https://appgallery.huawei.com/app/${appId}` : '',
    };
  }

  private getAppInfoUrl() {
    return process.env.APPGALLERY_APPINFO_URL || DEFAULT_APPGALLERY_APPINFO_URL;
  }

  private getSearchUrl() {
    return process.env.APPGALLERY_SEARCH_URL || DEFAULT_APPGALLERY_SEARCH_URL;
  }

  private getPlatformConfig(platform: AppGalleryPlatformType) {
    return APPGALLERY_PLATFORM_CONFIGS[platform];
  }

  private isNotificationConfigured() {
    return !!this.getEchoQbApiKey();
  }

  private isNotificationEnabled() {
    return process.env.ECHOQB_NOTIFY_ENABLED === 'true';
  }

  private getEchoQbApiKey() {
    return process.env.ECHOQB_APP_API_KEY || '';
  }

  private getNotificationOutbox(config: AppGalleryPlatformConfig): AppGalleryNotificationOutboxItemDto[] {
    return getLocalData(config.notificationOutboxStorage);
  }

  private setNotificationOutbox(config: AppGalleryPlatformConfig, outbox: AppGalleryNotificationOutboxItemDto[]) {
    return setLocalData(config.notificationOutboxStorage, outbox);
  }

  private recordNotificationResult(config: AppGalleryPlatformConfig, result) {
    setLocalData(config.lastNotificationResultStorage, result);
    return result;
  }

  private async enqueueChangedNotifications(platform: AppGalleryPlatformType, changed: AppGalleryVersionChangeDto[], scannedAt: number) {
    if (!changed.length) {
      return null;
    }

    const config = this.getPlatformConfig(platform);
    const idempotencyKey = this.makeNotificationIdempotencyKey(config, changed);
    const outbox = this.getNotificationOutbox(config);
    const exists = outbox.find(item => item.idempotencyKey === idempotencyKey);
    if (exists) {
      // 同一批版本变更已进入 outbox，避免重复写入导致重复推送。
      return exists;
    }

    const now = Date.now();
    const item: AppGalleryNotificationOutboxItemDto = {
      id: `${config.notifyIdPrefix}-${now}-${outbox.length + 1}`,
      idempotencyKey,
      status: 'pending',
      changed,
      scannedAt,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
    };

    this.setNotificationOutbox(config, [...outbox, item]);
    return item;
  }

  private makeNotificationIdempotencyKey(config: AppGalleryPlatformConfig, changed: AppGalleryVersionChangeDto[]) {
    // echoqB 幂等键有长度限制，这里用固定前缀 + 变更指纹哈希保持稳定且短。
    const fingerprint = changed
      .map(item => `${item.platform || config.platform}:${item.packageName}:${item.newVersionCode || item.newVersion}`)
      .sort()
      .join('|');
    const hash = createHash('sha256').update(fingerprint).digest('hex').slice(0, 32);
    return `${config.idempotencyPrefix}:${hash}`;
  }

  private async sendNotificationItem(config: AppGalleryPlatformConfig, item: AppGalleryNotificationOutboxItemDto) {
    const now = Date.now();
    const outbox = this.getNotificationOutbox(config);
    const targetIndex = outbox.findIndex(it => it.id === item.id);
    const target = targetIndex >= 0 ? outbox[targetIndex] : item;

    try {
      const message = this.makeNotificationMessage(config, target);
      const res = await axios.post(this.getEchoQbMessageUrl(), message, {
        headers: {
          'Content-Type': 'application/json',
          'X-App-API-Key': this.getEchoQbApiKey(),
          'Idempotency-Key': target.idempotencyKey,
        },
      });
      const nextItem: AppGalleryNotificationOutboxItemDto = {
        ...target,
        status: 'sent',
        attempts: target.attempts + 1,
        lastAttemptAt: now,
        updatedAt: now,
        errMsg: undefined,
        messageId: res.data && res.data.message_id,
        response: res.data,
      };
      this.replaceNotificationOutboxItem(config, nextItem);
      return {
        success: true,
        id: nextItem.id,
        idempotencyKey: nextItem.idempotencyKey,
        messageId: nextItem.messageId,
        platform: config.platform,
      };
    } catch (err) {
      const nextItem: AppGalleryNotificationOutboxItemDto = {
        ...target,
        status: 'failed',
        attempts: target.attempts + 1,
        lastAttemptAt: now,
        updatedAt: now,
        errMsg: err.message,
      };
      this.replaceNotificationOutboxItem(config, nextItem);
      console.log('appgallery notification send error -> ', config.platform, err.message);
      return {
        success: false,
        id: nextItem.id,
        idempotencyKey: nextItem.idempotencyKey,
        errMsg: nextItem.errMsg,
        platform: config.platform,
      };
    }
  }

  private replaceNotificationOutboxItem(config: AppGalleryPlatformConfig, item: AppGalleryNotificationOutboxItemDto) {
    const outbox = this.getNotificationOutbox(config);
    const targetIndex = outbox.findIndex(it => it.id === item.id);
    if (targetIndex >= 0) {
      outbox[targetIndex] = item;
    } else {
      outbox.push(item);
    }
    this.setNotificationOutbox(config, outbox);
  }

  private getEchoQbMessageUrl() {
    const baseUrl = (process.env.ECHOQB_API_BASE_URL || DEFAULT_ECHOQB_API_BASE_URL).replace(/\/$/, '');
    const appKey = process.env.ECHOQB_APP_KEY || DEFAULT_ECHOQB_APP_KEY;
    const channelKey = process.env.ECHOQB_CHANNEL_KEY || DEFAULT_ECHOQB_CHANNEL_KEY;
    return `${baseUrl}/api/v1/open/apps/${encodeURIComponent(appKey)}/channels/${encodeURIComponent(channelKey)}/messages`;
  }

  private makeNotificationMessage(config: AppGalleryPlatformConfig, item: AppGalleryNotificationOutboxItemDto) {
    return {
      title: config.notificationTitle,
      content: this.makeNotificationContent(config, item.changed),
      // 多应用聚合消息没有唯一落地页，只在单应用更新时跳转到 AppGallery 详情。
      action_url: item.changed.length === 1 ? item.changed[0].detailUrl : undefined,
      payload: {
        type: config.payloadType,
        platform: config.platform,
        scannedAt: item.scannedAt,
        changed: item.changed,
      },
      priority: 'normal',
      ttl_seconds: parseInt(process.env.APPGALLERY_NOTIFY_TTL_SECONDS || `${DEFAULT_APPGALLERY_NOTIFY_TTL_SECONDS}`),
    };
  }

  private makeNotificationContent(config: AppGalleryPlatformConfig, changed: AppGalleryVersionChangeDto[]) {
    const platformLabel = config.platform === 'harmony' ? ' HarmonyOS 版' : ' Android 版';
    const lines = changed.map(item => `${item.name || item.packageName}${platformLabel} ${item.oldVersion} → ${item.newVersion}`);
    const content = lines.join('\n');
    if (content.length <= 1000) {
      return content;
    }
    return `${content.slice(0, 980)}\n...等 ${changed.length} 个应用更新`;
  }
}
