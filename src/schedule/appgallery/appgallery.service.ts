import { Injectable, OnModuleInit } from "@nestjs/common";
import { dLog } from '@daozhao/utils';
import { createHash } from "crypto";
import { axios, getLocalData, setLocalData } from "../../utils";
import { ScheduleFactoryService } from "../scheduleFactory.service";
import {
  AppGalleryAppVersionDto,
  AppGalleryNotificationOutboxItemDto,
  AppGalleryWatchedAppDto,
  AppGalleryVersionChangeDto,
  appGalleryLastNotificationResultStorage,
  appGalleryNotificationOutboxStorage,
  appGalleryScanResultStorage,
  appGalleryVersionSnapshotStorage,
  appGalleryWatchedAppsStorage,
} from "./appgallery.dto";

const APPGALLERY_APPINFO_URL = process.env.APPGALLERY_APPINFO_URL || 'https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo';
const APPGALLERY_SEARCH_URL = process.env.APPGALLERY_SEARCH_URL || 'https://web-drcn.hispace.dbankcloud.com/edge/index/completeSearchWord';
const APPGALLERY_SCAN_MINUTES = parseInt(process.env.APPGALLERY_SCAN_MINUTES || '360');
const DEFAULT_ECHOQB_API_BASE_URL = 'http://localhost:8000';
const DEFAULT_ECHOQB_APP_KEY = 'appgallery-monitor';
const DEFAULT_ECHOQB_CHANNEL_KEY = 'app-version-updates';
const DEFAULT_APPGALLERY_NOTIFY_TTL_SECONDS = 86400;

@Injectable()
export class AppGalleryService implements OnModuleInit {
  private scheduleJobInstance;

  constructor(private readonly scheduleFactoryService: ScheduleFactoryService) {
    const { setSchedule, scheduleJobInstance, cancelSchedule } = this.scheduleFactoryService.make({
      type: 'appgallery',
      key: 'versionScanner',
      scheduleMinutes: APPGALLERY_SCAN_MINUTES,
    }, () => this.scan({ isSchedule: true, skipSetSchedule: true }));

    this.scheduleJobInstance = {
      setSchedule,
      getInstance: scheduleJobInstance.getInstance,
      cancelSchedule,
    };
  }

  onModuleInit() {
    Promise.resolve().then(async () => {
      await this.scan({ isStartup: true });
    }).catch(err => {
      console.log('appgallery scanner auto start error -> ', err.message);
    });
  }

  getWatchedApps(): AppGalleryWatchedAppDto[] {
    return getLocalData(appGalleryWatchedAppsStorage);
  }

  updateWatchedApps(list: AppGalleryWatchedAppDto[]) {
    const normalizedList = list
      .filter(item => item && item.packageName)
      .map(item => ({
        packageName: item.packageName.trim(),
        name: item.name,
      }));

    setLocalData(appGalleryWatchedAppsStorage, normalizedList);
    return normalizedList;
  }

  addWatchedApp(app: AppGalleryWatchedAppDto) {
    const packageName = app && app.packageName && app.packageName.trim();
    if (!packageName) {
      throw new Error('packageName is required');
    }

    const list = this.getWatchedApps();
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

    setLocalData(appGalleryWatchedAppsStorage, list);
    return {
      app: normalizedApp,
      list,
      isNew: targetIndex < 0,
    };
  }

  removeWatchedApp(packageName: string) {
    const list = this.getWatchedApps();
    const newList = list.filter(item => item.packageName !== packageName);

    setLocalData(appGalleryWatchedAppsStorage, newList);
    return {
      packageName,
      isRemoved: newList.length !== list.length,
      list: newList,
    };
  }

  isWatched(packageName: string) {
    const target = this.getWatchedApps().find(item => item.packageName === packageName);

    return {
      packageName,
      isWatched: !!target,
      app: target || null,
    };
  }

  async searchApps(keyword: string) {
    const res = await axios.post(APPGALLERY_SEARCH_URL, {
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

    const watchedPackageNames = new Set(this.getWatchedApps().map(item => item.packageName));
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
      }));

    return {
      keyword,
      suggestions: data.list || [],
      apps,
    };
  }

  getLastScanResult() {
    return getLocalData(appGalleryScanResultStorage);
  }

  getNotificationStatus() {
    return {
      enabled: this.isNotificationEnabled(),
      configured: this.isNotificationConfigured(),
      outbox: getLocalData(appGalleryNotificationOutboxStorage),
      lastResult: getLocalData(appGalleryLastNotificationResultStorage),
    };
  }

  async getAppVersion(packageName: string) {
    const snapshot = getLocalData(appGalleryVersionSnapshotStorage);
    const watchedApps = this.getWatchedApps();
    const watchedApp = watchedApps.find(item => item.packageName === packageName) || { packageName };
    const cachedVersion = snapshot[packageName];

    if (cachedVersion) {
      return {
        ...cachedVersion,
        _source: 'local snapshot',
      };
    }

    return {
      ...await this.fetchAppInfo(watchedApp),
      _source: 'appgallery',
    };
  }

  getNextUpdateTime() {
    const instance = this.scheduleJobInstance.getInstance();
    return instance && instance.nextInvocation() || 0;
  }

  stop() {
    return this.scheduleJobInstance.cancelSchedule();
  }

  async scan(options: any = {}) {
    const watchedApps = this.getWatchedApps();
    const previousSnapshot = getLocalData(appGalleryVersionSnapshotStorage);
    const nextSnapshot = {};
    const changed: AppGalleryVersionChangeDto[] = [];
    const unchanged = [];
    const failed = [];

    for (const watchedApp of watchedApps) {
      try {
        const appInfo = await this.fetchAppInfo(watchedApp);
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
    };

    setLocalData(appGalleryVersionSnapshotStorage, {
      ...previousSnapshot,
      ...nextSnapshot,
    });
    setLocalData(appGalleryScanResultStorage, result);
    // 快照先落盘，通知失败时依赖 outbox 后续补发，避免扫描结果被回滚。
    await this.enqueueChangedNotifications(result.changed, result.scannedAt);
    await this.retryNotifications();
    if (!options.skipSetSchedule) {
      this.scheduleJobInstance.setSchedule(APPGALLERY_SCAN_MINUTES);
    }

    dLog(`AppGallery版本扫描完成，更新${changed.length}个，失败${failed.length}个`);
    return {
      ...result,
      nextUpdateTime: this.getNextUpdateTime(),
    };
  }

  async retryNotifications() {
    if (!this.isNotificationEnabled()) {
      return this.recordNotificationResult({
        success: true,
        skipped: true,
        reason: 'ECHOQB_NOTIFY_ENABLED is not true',
        checkedAt: Date.now(),
      });
    }

    if (!this.isNotificationConfigured()) {
      return this.recordNotificationResult({
        success: false,
        skipped: true,
        reason: 'ECHOQB_APP_API_KEY is required',
        checkedAt: Date.now(),
      });
    }

    const outbox = this.getNotificationOutbox();
    const results = [];

    for (const item of outbox.filter(it => it.status !== 'sent')) {
      results.push(await this.sendNotificationItem(item));
    }

    const result = {
      success: results.every(item => item.success),
      total: results.length,
      results,
      checkedAt: Date.now(),
    };
    return this.recordNotificationResult(result);
  }

  private async fetchAppInfo(watchedApp: AppGalleryWatchedAppDto): Promise<AppGalleryAppVersionDto> {
    const res = await axios.post(APPGALLERY_APPINFO_URL, {
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

  private isNotificationConfigured() {
    return !!this.getEchoQbApiKey();
  }

  private isNotificationEnabled() {
    return process.env.ECHOQB_NOTIFY_ENABLED === 'true';
  }

  private getEchoQbApiKey() {
    return process.env.ECHOQB_APP_API_KEY || '';
  }

  private getNotificationOutbox(): AppGalleryNotificationOutboxItemDto[] {
    return getLocalData(appGalleryNotificationOutboxStorage);
  }

  private setNotificationOutbox(outbox: AppGalleryNotificationOutboxItemDto[]) {
    return setLocalData(appGalleryNotificationOutboxStorage, outbox);
  }

  private recordNotificationResult(result) {
    setLocalData(appGalleryLastNotificationResultStorage, result);
    return result;
  }

  private async enqueueChangedNotifications(changed: AppGalleryVersionChangeDto[], scannedAt: number) {
    if (!changed.length) {
      return null;
    }

    const idempotencyKey = this.makeNotificationIdempotencyKey(changed);
    const outbox = this.getNotificationOutbox();
    const exists = outbox.find(item => item.idempotencyKey === idempotencyKey);
    if (exists) {
      // 同一批版本变更已进入 outbox，避免重复写入导致重复推送。
      return exists;
    }

    const now = Date.now();
    const item: AppGalleryNotificationOutboxItemDto = {
      id: `appgallery-notify-${now}-${outbox.length + 1}`,
      idempotencyKey,
      status: 'pending',
      changed,
      scannedAt,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
    };

    this.setNotificationOutbox([...outbox, item]);
    return item;
  }

  private makeNotificationIdempotencyKey(changed: AppGalleryVersionChangeDto[]) {
    // echoqB 幂等键有长度限制，这里用固定前缀 + 变更指纹哈希保持稳定且短。
    const fingerprint = changed
      .map(item => `${item.packageName}:${item.newVersionCode || item.newVersion}`)
      .sort()
      .join('|');
    const hash = createHash('sha256').update(fingerprint).digest('hex').slice(0, 32);
    return `appgallery-version:${hash}`;
  }

  private async sendNotificationItem(item: AppGalleryNotificationOutboxItemDto) {
    const now = Date.now();
    const outbox = this.getNotificationOutbox();
    const targetIndex = outbox.findIndex(it => it.id === item.id);
    const target = targetIndex >= 0 ? outbox[targetIndex] : item;

    try {
      const message = this.makeNotificationMessage(target);
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
      this.replaceNotificationOutboxItem(nextItem);
      return {
        success: true,
        id: nextItem.id,
        idempotencyKey: nextItem.idempotencyKey,
        messageId: nextItem.messageId,
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
      this.replaceNotificationOutboxItem(nextItem);
      console.log('appgallery notification send error -> ', err.message);
      return {
        success: false,
        id: nextItem.id,
        idempotencyKey: nextItem.idempotencyKey,
        errMsg: nextItem.errMsg,
      };
    }
  }

  private replaceNotificationOutboxItem(item: AppGalleryNotificationOutboxItemDto) {
    const outbox = this.getNotificationOutbox();
    const targetIndex = outbox.findIndex(it => it.id === item.id);
    if (targetIndex >= 0) {
      outbox[targetIndex] = item;
    } else {
      outbox.push(item);
    }
    this.setNotificationOutbox(outbox);
  }

  private getEchoQbMessageUrl() {
    const baseUrl = (process.env.ECHOQB_API_BASE_URL || DEFAULT_ECHOQB_API_BASE_URL).replace(/\/$/, '');
    const appKey = process.env.ECHOQB_APP_KEY || DEFAULT_ECHOQB_APP_KEY;
    const channelKey = process.env.ECHOQB_CHANNEL_KEY || DEFAULT_ECHOQB_CHANNEL_KEY;
    return `${baseUrl}/api/v1/open/apps/${encodeURIComponent(appKey)}/channels/${encodeURIComponent(channelKey)}/messages`;
  }

  private makeNotificationMessage(item: AppGalleryNotificationOutboxItemDto) {
    return {
      title: 'AppGallery 应用版本更新',
      content: this.makeNotificationContent(item.changed),
      // 多应用聚合消息没有唯一落地页，只在单应用更新时跳转到 AppGallery 详情。
      action_url: item.changed.length === 1 ? item.changed[0].detailUrl : undefined,
      payload: {
        type: 'scanner.appgallery.version_changed',
        scannedAt: item.scannedAt,
        changed: item.changed,
      },
      priority: 'normal',
      ttl_seconds: parseInt(process.env.APPGALLERY_NOTIFY_TTL_SECONDS || `${DEFAULT_APPGALLERY_NOTIFY_TTL_SECONDS}`),
    };
  }

  private makeNotificationContent(changed: AppGalleryVersionChangeDto[]) {
    const lines = changed.map(item => `${item.name || item.packageName} ${item.oldVersion} → ${item.newVersion}`);
    const content = lines.join('\n');
    if (content.length <= 1000) {
      return content;
    }
    return `${content.slice(0, 980)}\n...等 ${changed.length} 个应用更新`;
  }
}
