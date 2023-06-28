import { Injectable } from '@nestjs/common';
import { getLocalData, setLocalData, updateLocalData } from '../../../utils';
import { StorageDto, StorageListItemDto } from "../../dto/storage.dto";
import { VersionService } from "./version.service";

// 通用的根据有无_expire新增和作废list的service
@Injectable()
export class UpdateListService {
  get(storage: StorageDto): Array<any> {
    return getLocalData(storage);
  }

  set(storage: StorageDto, incomeList: Array<StorageListItemDto>): any {
    const incomeListKeyType = incomeList.map(item => this.compareData(item));
    const oldList: Array<StorageListItemDto> = this.get(storage);
    const remainList: Array<StorageListItemDto> = oldList.filter(item => !incomeListKeyType.includes(this.compareData(item))); // 仅保留不在newTypeList的
    const newList: Array<StorageListItemDto> = incomeList.filter(item => !item._expire);
    const deleteList: Array<StorageListItemDto> = incomeList.filter(item => item._expire);
    const finalList = [...remainList, ...newList];
    setLocalData(storage, finalList);
    return {
      list: finalList,
      newList,
      deleteList,
    };
  }

  compareData(data) {
    return data.key + '_' + data.type;
  }
}
