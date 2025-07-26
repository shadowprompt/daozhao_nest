import { StorageDto, StorageListItemDto } from '../../common/dto/storage.dto';

export const scheduleStorageDto: StorageDto = {
  name: 'schedule',
  key: 'scheduleHandlers',
  emptyValue: `[]`,
};

export const weixinAccessTokenDto: AccessTokenScheduleInfoDto = {
  type: 'weixin',
  key: 'accessToken',
  scheduleMinutes: 120,
};

export const weixinFitconverterAccessTokenDto: AccessTokenScheduleInfoDto = {
  type: 'weixinFitconverter',
  key: 'accessToken',
  scheduleMinutes: 120,
};

export const HMSAccessTokenDto: AccessTokenScheduleInfoDto = {
  type: 'HMS',
  key: 'accessToken',
  scheduleMinutes: 120,
};

export const HMS_HIAccessTokenDto: AccessTokenScheduleInfoDto = {
  type: 'HMS_HI',
  key: 'accessToken',
  scheduleMinutes: 120,
};

export const HMS_webPushAccessTokenDto: AccessTokenScheduleInfoDto = {
  type: 'HMS_webPush',
  key: 'accessToken',
  scheduleMinutes: 120,
};

export class ScheduleInfoDto {
  label: string;
  pathName: string;
  fetchData: any;
  setSchedule: any;
  cancelSchedule: any;
  scheduleJobInstance: any;
  requestHandler: any;
}

export class AccessTokenScheduleInfoDto {
  type: string;
  key: string;
  scheduleMinutes: number = 120
}

export class storeData {
  list: Array<StorageListItemDto>;
  newList: Array<StorageListItemDto>;
  deleteList: Array<StorageListItemDto>;
}