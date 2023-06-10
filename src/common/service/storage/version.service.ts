import { Injectable } from '@nestjs/common';
import { getLocalData, updateLocalData } from '../../../utils';
import { StorageDto } from "../../dto/storage.dto";

@Injectable()
export class VersionService {
  get(storage: StorageDto): string {
    return getLocalData(storage);
  }

  set(storage: StorageDto, params, updateHandler): Array<string>[] {
    return updateLocalData(storage, params, updateHandler);
  }
}
