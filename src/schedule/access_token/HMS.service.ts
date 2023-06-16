import { Injectable, OnModuleInit } from "@nestjs/common";
import { AccessTokenFactoryService } from "./accessTokenFactory.service";
import { HMSAccessTokenDto } from "../dto/schedule.dto";

const qs = require('querystring');
const {HMS_CLIENT_ID, HMS_CLIENT_SECRET, HMS_API_URL, DAOZHAO_SCHEDULE_SERVER} = require('@daozhao/config');

const params = {
  grant_type: 'client_credentials',
  client_id: HMS_CLIENT_ID,
  client_secret: HMS_CLIENT_SECRET,
};

@Injectable()
export class HMSService {
  public scheduleInfo;
  constructor(private readonly accessTokenServiceFactoryService: AccessTokenFactoryService) {
    this.scheduleInfo = this.make();
  }

  make() {
    return this.accessTokenServiceFactoryService.make(HMSAccessTokenDto, {
      url: HMS_API_URL,
      method: 'post',
      data: qs.stringify(params),
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    }, (data) => {
      if (data.errcode || data.errmsg) {
        return data.errcode + ':' + data.errmsg;
      }
    }, DAOZHAO_SCHEDULE_SERVER + '/HMS');
  }
}
