import { Injectable } from '@nestjs/common';
import { getLocalData, setLocalData, updateLocalData } from '../../../utils';
import { StorageDto, StorageListItemDto } from "../../dto/storage.dto";
import { VersionService } from "./version.service";

// 通用的根据有无_expire新增和作废list的service
@Injectable()
export class UpdateListService {
  constructor(private readonly versionService: VersionService) {
  }
  get(storage: StorageDto): Array<any> {
    return getLocalData(storage);
  }

  set(storage: StorageDto, list: Array<StorageListItemDto>): Array<string>[] {
    const newListKeyType = list.map(item => this.compareData(item));
    const oldList = this.get(storage);
    const remainList = oldList.filter(item => !newListKeyType.includes(this.compareData(item))); // 仅保留不在newTypeList的

    const finalList = [...remainList, ...list.filter(item => !item._expire)];

    return setLocalData(storage, finalList);
  }

  compareData(data) {
    return data.key + '_' + data.type;
  }
}
