export class StorageDto {
  name: string;

  key: string;

  emptyValue?: string;
}


export class StorageListItemDto {
  type: string;
  key: string;
  serverUrl: string;
  pathName: string;
  scheduleMinutes: number
  _expire: boolean
}
