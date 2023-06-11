import { StorageDto } from "../../common/dto/storage.dto";

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
  scheduleJobInstance: any;
  requestHandler: any;
}

export class AccessTokenScheduleInfoDto {
  type: string;
  key: string;
  scheduleMinutes: number = 120
}
