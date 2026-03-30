# Douyin General Search Proxy

这个目录提供一个最小可用的中转 API，用于把 TikHub 的复杂嵌套响应整理成更适合 Coze 使用的扁平结构。

## 目录说明

- `server.js`：本地 Node HTTP 服务版本
- `api/douyin/general-search.js`：Vercel Serverless Function 入口
- `api/health.js`：Vercel 健康检查接口
- `lib/flatten.js`：响应扁平化逻辑
- `openapi.yaml`：本地服务版 OpenAPI
- `openapi.vercel.yaml`：Vercel 部署版 OpenAPI
- `openapi.vercel.template.yaml`：可复用的生产版 OpenAPI 模板
- `vercel.json`：Vercel 配置
- `.gitignore`：Git 忽略配置
- `DEPLOY_CHECKLIST.md`：部署检查清单

## 本地启动方式

1. 复制环境变量模板

```bash
cp .env.example .env
```

2. 在 `.env` 中填入你的 TikHub Token

```bash
TIKHUB_API_TOKEN=your_tikhub_api_token
```

3. 启动服务

```bash
PORT=8787 TIKHUB_API_TOKEN=your_tikhub_api_token npm start
```

## 接口

- 健康检查：`GET /health`
- 搜索接口：`POST /api/douyin/general-search`

## 输入示例

```json
{
  "keyword": "猫咪",
  "cursor": 0,
  "sort_type": "0",
  "publish_time": "0",
  "filter_duration": "0",
  "content_type": "0",
  "search_id": "",
  "backtrace": ""
}
```

## 输出说明

中转层会把 TikHub 的：

- `data.business_data[].type`
- `data.business_data[].data.aweme_info.*`

整理成：

- `items[].type`
- `items[].aweme_id`
- `items[].desc`
- `items[].author_nickname`
- `items[].music_title`
- `items[].video_play_urls`
- `items[].digg_count`

等扁平字段。

## Vercel 部署步骤

1. 把 `proxy/` 目录作为一个独立项目上传到 Git 仓库
2. 在 Vercel 中导入该项目
3. 在 Vercel 项目环境变量中配置：

```bash
TIKHUB_API_TOKEN=your_tikhub_api_token
```

4. 部署完成后，记下域名，例如：

```bash
https://your-vercel-domain.vercel.app
```

5. 打开 [openapi.vercel.yaml](/Users/ypc/Desktop/coze原生插件开发/douyin-general-search/proxy/openapi.vercel.yaml)，把：

```yaml
https://your-vercel-domain.vercel.app
```

替换成你的真实 Vercel 域名

6. 在 Coze 中导入替换后的 `openapi.vercel.yaml`

如果你想保留一份未替换域名的模板，使用 [openapi.vercel.template.yaml](/Users/ypc/Desktop/coze原生插件开发/douyin-general-search/proxy/openapi.vercel.template.yaml)，把：

```yaml
__VERCEL_BASE_URL__
```

替换成你的真实域名即可。

## Coze 接入建议

本地调试时，导入 [openapi.yaml](/Users/ypc/Desktop/coze原生插件开发/douyin-general-search/proxy/openapi.yaml)。

真正上架或给别人使用时，导入 [openapi.vercel.yaml](/Users/ypc/Desktop/coze原生插件开发/douyin-general-search/proxy/openapi.vercel.yaml)，而不是直接导入第三方 TikHub 接口文档。
