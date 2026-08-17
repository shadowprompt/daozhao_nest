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
