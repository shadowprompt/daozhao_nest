import { StorageDto } from "../../common/dto/storage.dto";

export const appGalleryWatchedAppsStorage: StorageDto = {
  name: 'appgallery',
  key: 'watchedApps',
  emptyValue: JSON.stringify([
    { packageName: 'com.tencent.mm', name: '微信' },
    { packageName: 'com.tencent.mobileqq', name: 'QQ' },
    { packageName: 'com.eg.android.AlipayGphone', name: '支付宝' },
    { packageName: 'com.ss.android.ugc.aweme', name: '抖音' },
    { packageName: 'com.taobao.taobao', name: '淘宝' },
    { packageName: 'com.jingdong.app.mall', name: '京东' },
    { packageName: 'com.sina.weibo', name: '微博' },
    { packageName: 'com.baidu.searchbox', name: '百度' },
    { packageName: 'com.autonavi.minimap', name: '高德地图' },
    { packageName: 'com.tencent.mtt', name: 'QQ浏览器' },
    { packageName: 'com.netease.cloudmusic', name: '网易云音乐' },
    { packageName: 'com.tencent.qqmusic', name: 'QQ音乐' },
  ]),
};

export const appGalleryVersionSnapshotStorage: StorageDto = {
  name: 'appgallery',
  key: 'versionSnapshot',
  emptyValue: '{}',
};

export const appGalleryScanResultStorage: StorageDto = {
  name: 'appgallery',
  key: 'lastScanResult',
  emptyValue: '{}',
};

export const appGalleryNotificationOutboxStorage: StorageDto = {
  name: 'appgallery',
  key: 'notificationOutbox',
  emptyValue: '[]',
};

export const appGalleryLastNotificationResultStorage: StorageDto = {
  name: 'appgallery',
  key: 'lastNotificationResult',
  emptyValue: '{}',
};

export type AppGalleryWatchedAppDto = {
  packageName: string;
  name?: string;
};

export type AppGalleryAppVersionDto = {
  appId: string;
  packageName: string;
  name: string;
  version: string;
  versionCode: number;
  developerName?: string;
  detailUrl: string;
  updatedAt: number;
};

export type AppGalleryVersionChangeDto = {
  packageName: string;
  name: string;
  oldVersion: string;
  oldVersionCode: number;
  newVersion: string;
  newVersionCode: number;
  detailUrl: string;
  updatedAt: number;
};

export type AppGalleryNotificationOutboxItemDto = {
  id: string;
  idempotencyKey: string;
  status: 'pending' | 'sent' | 'failed';
  changed: AppGalleryVersionChangeDto[];
  scannedAt: number;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  errMsg?: string;
  messageId?: string;
  response?: any;
};
