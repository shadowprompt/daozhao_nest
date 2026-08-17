import { Injectable, OnModuleInit } from "@nestjs/common";
import { dLog } from '@daozhao/utils';
import { axios, getLocalData, setLocalData } from "../../utils";
import { ScheduleFactoryService } from "../scheduleFactory.service";
import {
  AppGalleryAppVersionDto,
  AppGalleryWatchedAppDto,
  appGalleryScanResultStorage,
  appGalleryVersionSnapshotStorage,
  appGalleryWatchedAppsStorage,
} from "./appgallery.dto";

const APPGALLERY_APPINFO_URL = process.env.APPGALLERY_APPINFO_URL || 'https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo';
const APPGALLERY_SEARCH_URL = process.env.APPGALLERY_SEARCH_URL || 'https://web-drcn.hispace.dbankcloud.com/edge/index/completeSearchWord';
const APPGALLERY_SCAN_MINUTES = parseInt(process.env.APPGALLERY_SCAN_MINUTES || '360');

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
    const changed = [];
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
    if (!options.skipSetSchedule) {
      this.scheduleJobInstance.setSchedule(APPGALLERY_SCAN_MINUTES);
    }

    dLog(`AppGallery版本扫描完成，更新${changed.length}个，失败${failed.length}个`);
    return {
      ...result,
      nextUpdateTime: this.getNextUpdateTime(),
    };
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
}
