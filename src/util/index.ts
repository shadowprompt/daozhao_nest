const path = require('path');
import { StorageDto } from '../common/dto/storage.dto';
import { LocalStorage } from 'node-localstorage';

export const nodeStore = (scope: string) => {
  const localStoragePath = path.resolve(
    __dirname,
    '../../../localStorage/',
    scope,
  );
  return new LocalStorage(localStoragePath);
};

export const getLocalData = (storage: StorageDto) => {
  const localStorage = nodeStore(storage.name);
  const lastDataStr = localStorage.getItem(storage.key) || storage.emptyValue || '""';
  return JSON.parse(lastDataStr);
};

export function updateLocalData(storage, incomeData, updateHandler = (preVal, incomeData) => preVal) {
  const lastData = getLocalData(storage);
  const newData = updateHandler(lastData, incomeData);
  const localStorage = nodeStore(storage.name);
  localStorage.setItem(storage.key, JSON.stringify(newData));
  return [lastData, newData];
}
