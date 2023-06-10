const https = require('https');
const path = require('path');
import axios from "axios";
import { LocalStorage } from 'node-localstorage';

import { StorageDto } from '../common/dto/storage.dto';

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

export function setLocalData(storage, newData) {
  const localStorage = nodeStore(storage.name);
  localStorage.setItem(storage.key, JSON.stringify(newData));
  return newData;
}

export function updateLocalData(storage, incomeData, updateHandler = (preVal, incomeData) => preVal) {
  const lastData = getLocalData(storage);
  const newData = updateHandler(lastData, incomeData);
  const localStorage = nodeStore(storage.name);
  localStorage.setItem(storage.key, JSON.stringify(newData));
  return [lastData, newData];
}

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

function instanceStoreMaker() {
  const instanceMap = {};
  return {
    getItem(key) {
      return instanceMap[key];
    },
    setItem(key, value) {
      return instanceMap[key] = value;
    }
  };
}
export const instanceStore = instanceStoreMaker();

export {
  axiosInstance as axios,
};
