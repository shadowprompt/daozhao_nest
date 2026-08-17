# Schedule Handler 和 Access Token 调用说明

本文档说明当前项目里平台 `access_token` 和通用 `handler` 的调用方式。

## 平台 Access Token

平台 token 现在由统一控制器分发，原有接口仍然兼容。

### 兼容旧接口

```bash
POST /weixin
GET  /weixin/list

POST /HMS
GET  /HMS/list

POST /HMS_HI
GET  /HMS_HI/list

POST /HMS_webPush
GET  /HMS_webPush/list
```

### 推荐统一接口

```bash
POST /access-token/:type
GET  /access-token/:type/list
```

其中 `:type` 对应平台类型，例如：

```bash
POST /access-token/weixin
GET  /access-token/weixin/list

POST /access-token/HMS
GET  /access-token/HMS/list

POST /access-token/HMS_HI
GET  /access-token/HMS_HI/list
```

### 强制从官方刷新 token

```bash
curl -X POST http://localhost:5566/access-token/weixin \
  -H "Content-Type: application/json" \
  -d '{"isDirect": true}'
```

`isDirect: true` 会跳过本地缓存和开发环境代理，直接请求官方接口。

### 查看下一次刷新时间

```bash
curl http://localhost:5566/access-token/weixin/list
```

返回示例：

```json
{
  "nextUpdateTime": "2026-08-18T10:30:00.000Z"
}
```

### 新增 token 平台

新增平台时，优先修改：

```text
src/schedule/access_token/accessTokenRegistry.service.ts
```

在 `ACCESS_TOKEN_PLATFORMS` 中增加一项平台配置即可。通常需要提供：

```ts
{
  type: 'newPlatform',
  daozhaoPath: '/newPlatform',
  requestOptions: () => ({
    url: 'https://official.example.com/token',
    method: 'GET',
    params: {
      appid: 'xxx',
      secret: 'xxx',
    },
  }),
  httpError: (data) => {
    if (data.errcode || data.errmsg) {
      return data.errcode + ':' + data.errmsg;
    }
  },
}
```

新增后即可调用：

```bash
POST /access-token/newPlatform
GET  /access-token/newPlatform/list
```

## 通用 Handler

通用 handler 用于配置和触发远端任务。外部调用入口现在固定为 `/handlers/run/:type/:key`，真正请求的远端地址仍由 handler 配置里的 `serverUrl + pathName` 决定。

### 查看 handler 列表

```bash
curl http://localhost:5566/handlers
```

### 保存或更新 handler

```bash
curl -X POST http://localhost:5566/handlers \
  -H "Content-Type: application/json" \
  -d '{
    "list": [
      {
        "type": "crawl",
        "key": "exam",
        "serverUrl": "https://example.com",
        "pathName": "/exam/list",
        "scheduleMinutes": 30,
        "postData": {
          "city": "shanghai"
        }
      }
    ]
  }'
```

保存后，服务会立即触发一次该 handler，并按照 `scheduleMinutes` 设置下一次定时执行。

### 手动触发 handler

```bash
curl -X POST http://localhost:5566/handlers/run/crawl/exam \
  -H "Content-Type: application/json" \
  -d '{}'
```

以上调用会根据保存的 handler 配置，请求：

```text
https://example.com/exam/list
```

请求体默认使用 handler 配置中的 `postData`。

### 查看 handler 下一次执行时间

```bash
curl http://localhost:5566/handlers/run/crawl/exam/list
```

返回示例：

```json
{
  "nextUpdateTime": "2026-08-18T10:30:00.000Z"
}
```

### 停止 handler 定时任务

```bash
curl http://localhost:5566/handlers/run/crawl/exam/stop
```

返回示例：

```json
{
  "isCancelled": true
}
```

### 删除 handler

删除 handler 时，通过 `POST /handlers` 传入带 `_expire: true` 的配置：

```bash
curl -X POST http://localhost:5566/handlers \
  -H "Content-Type: application/json" \
  -d '{
    "list": [
      {
        "type": "crawl",
        "key": "exam",
        "pathName": "/exam/list",
        "_expire": true
      }
    ]
  }'
```

删除后服务会从本地 handler 列表移除该项，并取消对应定时任务。

## 调用方式变化

旧实现中，动态 handler 可能直接暴露成配置里的 `pathName`：

```bash
POST /exam/list
GET  /exam/list/list
GET  /exam/list/stop
```

现在推荐统一改为：

```bash
POST /handlers/run/:type/:key
GET  /handlers/run/:type/:key/list
GET  /handlers/run/:type/:key/stop
```

这样新增 handler 时不需要动态注册 Nest Controller，也不需要重启服务才能出现新路由。

## AppGallery 应用版本扫描

AppGallery 扫描服务用于定期检查华为应用市场中主流应用的版本变化。服务启动后会自动扫描一次，并设置下一次定时扫描。

默认扫描周期是 360 分钟，可以通过环境变量调整：

```bash
APPGALLERY_SCAN_MINUTES=360
```

默认详情接口是：

```bash
APPGALLERY_APPINFO_URL=https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo
```

### 查看监控应用列表

```bash
curl http://localhost:5566/appgallery/apps
```

默认监控列表包含微信、QQ、支付宝、抖音、淘宝、京东、微博、百度、高德地图、QQ浏览器、网易云音乐、QQ音乐。

### 检查某个包名是否在监控列表

```bash
curl http://localhost:5566/appgallery/apps/com.tencent.mm/watched
```

返回示例：

```json
{
  "packageName": "com.tencent.mm",
  "isWatched": true,
  "app": {
    "packageName": "com.tencent.mm",
    "name": "微信"
  }
}
```

### 按应用名搜索包名

```bash
curl "http://localhost:5566/appgallery/search?keyword=微信"
```

返回结果中的 `packageName` 就是后续监控和查询版本时要使用的包名。

返回示例：

```json
{
  "keyword": "微信",
  "suggestions": [
    "企业微信",
    "微信读书"
  ],
  "apps": [
    {
      "appId": "C5683",
      "packageName": "com.tencent.mm",
      "name": "微信",
      "version": "8.0.76",
      "kindName": "社交通讯",
      "memo": "微信，是一个生活方式。",
      "detailUrl": "https://appgallery.huawei.com/app/C5683",
      "isWatched": true
    }
  ]
}
```

### 追加单个应用到监控列表

```bash
curl -X POST http://localhost:5566/appgallery/apps/add \
  -H "Content-Type: application/json" \
  -d '{
    "packageName": "com.tencent.wework",
    "name": "企业微信"
  }'
```

如果 `packageName` 已存在，会更新该项的 `name`，不会重复插入。

返回示例：

```json
{
  "app": {
    "packageName": "com.tencent.wework",
    "name": "企业微信"
  },
  "list": [
    {
      "packageName": "com.tencent.mm",
      "name": "微信"
    },
    {
      "packageName": "com.tencent.wework",
      "name": "企业微信"
    }
  ],
  "isNew": true
}
```

追加后可以手动触发一次扫描，建立该应用的版本基线：

```bash
curl -X POST http://localhost:5566/appgallery/scan \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 移除单个监控应用

```bash
curl -X POST http://localhost:5566/appgallery/apps/remove \
  -H "Content-Type: application/json" \
  -d '{
    "packageName": "com.tencent.wework"
  }'
```

### 整体更新监控应用列表

注意：该接口会整体覆盖当前监控列表。只想新增单个应用时，优先使用 `/appgallery/apps/add`。

```bash
curl -X POST http://localhost:5566/appgallery/apps \
  -H "Content-Type: application/json" \
  -d '{
    "list": [
      {
        "packageName": "com.tencent.mm",
        "name": "微信"
      },
      {
        "packageName": "com.eg.android.AlipayGphone",
        "name": "支付宝"
      }
    ]
  }'
```

### 手动触发扫描

```bash
curl -X POST http://localhost:5566/appgallery/scan \
  -H "Content-Type: application/json" \
  -d '{}'
```

首次扫描会建立本地版本基线，不会把所有应用都当成版本更新。后续扫描会对比本地快照里的 `version` 和 `versionCode`。

返回示例：

```json
{
  "success": true,
  "scannedAt": 1787000000000,
  "total": 2,
  "changed": [
    {
      "packageName": "com.tencent.mm",
      "name": "微信",
      "oldVersion": "8.0.75",
      "oldVersionCode": 3139,
      "newVersion": "8.0.76",
      "newVersionCode": 3141,
      "detailUrl": "https://appgallery.huawei.com/app/C5683",
      "updatedAt": 1787000000000
    }
  ],
  "unchanged": [],
  "failed": [],
  "isStartup": false,
  "isSchedule": false,
  "nextUpdateTime": "2026-08-18T10:30:00.000Z"
}
```

### 查看最近一次扫描结果

```bash
curl http://localhost:5566/appgallery/versions
```

### 查询单个应用当前版本

```bash
curl http://localhost:5566/appgallery/apps/com.tencent.mm/version
```

如果本地已有扫描快照，会直接返回快照中的版本信息；如果没有快照，会实时请求 AppGallery 详情接口。

返回示例：

```json
{
  "appId": "C5683",
  "packageName": "com.tencent.mm",
  "name": "微信",
  "version": "8.0.76",
  "versionCode": 3141,
  "developerName": "腾讯科技（北京）有限公司",
  "detailUrl": "https://appgallery.huawei.com/app/C5683",
  "updatedAt": 1787000000000,
  "_source": "local snapshot"
}
```

### 查看下一次扫描时间

```bash
curl http://localhost:5566/appgallery/list
```

### 停止定时扫描

```bash
curl http://localhost:5566/appgallery/stop
```
