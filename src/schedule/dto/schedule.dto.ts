import { StorageDto } from "../../common/dto/storage.dto";

export const scheduleStorageDto: StorageDto = {
  name: 'schedule',
  key: 'scheduleHandlers',
  emptyValue: `[]`,
};

export const weixinAccessTokenDto: AccessTokenScheduleInfoDto = {
  type: 'weixin',
  key: 'accessToken',
  scheduleMinutes: 32,
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
