# Vercel 部署检查清单

## 一、上传代码前

- 确认不会提交真实的 TikHub Token
- 确认 `.env` 已被 `.gitignore` 忽略
- 确认仓库中包含以下文件：
  - `package.json`
  - `vercel.json`
  - `api/douyin/general-search.js`
  - `api/health.js`
  - `lib/flatten.js`
  - `openapi.vercel.yaml`

## 二、Vercel 项目配置

- 导入 `proxy/` 所在仓库
- Root Directory 选择当前 `proxy/` 目录
- Framework Preset 可选 `Other`
- Node 运行时使用 Vercel 默认即可

## 三、环境变量

必须配置：

- `TIKHUB_API_TOKEN`

可选配置：

- `PORT`
  说明：Vercel Serverless 不需要，只有本地运行时才会用到

## 四、部署后检查

部署成功后先访问：

- `/api/health`

预期返回：

```json
{
  "ok": true
}
```

再测试：

- `/api/douyin/general-search`

使用 POST 请求，请求体示例：

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

## 五、Coze 导入前

- 把 `openapi.vercel.yaml` 中的域名替换成真实 Vercel 域名
- 确认 Coze 中不再直接使用 TikHub 原始接口
- 统一使用你的代理接口
