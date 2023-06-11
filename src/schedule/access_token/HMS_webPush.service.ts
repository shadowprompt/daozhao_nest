import { Injectable } from "@nestjs/common";
import { AccessTokenFactoryService } from "./accessTokenFactory.service";
import { HMS_webPushAccessTokenDto } from "../dto/schedule.dto";

const qs = require('querystring');
const {HMS_CLIENT_ID_WEB, HMS_CLIENT_SECRET_WEB, HMS_API_URL, DAOZHAO_SCHEDULE_SERVER} = require('@daozhao/config');

const params = {
  grant_type: 'client_credentials',
  client_id: HMS_CLIENT_ID_WEB,
  client_secret: HMS_CLIENT_SECRET_WEB,
};

@Injectable()
export class HMS_webPushService {
  constructor(private readonly accessTokenServiceFactoryService: AccessTokenFactoryService) {}
  make() {
    return this.accessTokenServiceFactoryService.make(HMS_webPushAccessTokenDto, {
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
    }, DAOZHAO_SCHEDULE_SERVER + '/HMS_webPush');
  }
}
