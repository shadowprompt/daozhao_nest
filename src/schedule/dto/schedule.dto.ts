import { StorageDto } from "../../common/dto/storage.dto";

export const scheduleStorageDto: StorageDto = {
  name: 'schedule',
  key: 'scheduleHandlers',
  emptyValue: `[]`,
};

export class ScheduleInfoDto {
  label: string;
  pathName: string;
  fetchData: any;
  setSchedule: any;
  scheduleJobInstance: any;
  requestHandler: any;
}

export class AccessTokenInfoDto {
  type: string;
  key: string;
  TOKEN_SCHEDULE_MINUTES: number = 120
}
