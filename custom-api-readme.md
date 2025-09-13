## 🎵 自定义音源API配置

现在支持通过导入一个简单的 JSON 配置文件来对接第三方的音乐解析 API。这将提供极大的灵活性，可以接入任意第三方音源。

### 如何使用

1.  前往 **设置 -> 播放设置 -> 音源设置**。
2.  在 **自定义 API 设置** 区域，点击 **“导入 JSON 配置”** 按钮。
3.  选择你已经编写好的 `xxx.json` 配置文件。
4.  导入成功后，程序将优先使用你的自定义 API 进行解析。

### JSON 配置文件格式说明

导入的配置文件必须是一个合法的 JSON 文件，并包含以下字段：

| 字段名           | 类型      | 是否必须 | 描述                                                                                                                                           |
| ---------------- | --------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`           | `string`  | 是       | API 名称，将显示在应用的 UI 界面上。                                                                                                         |
| `apiUrl`         | `string`  | 是       | API 的基础请求地址。                                                                                                                           |
| `method`         | `string`  | 否       | HTTP 请求方法。可以是 `"GET"` 或 `"POST"`。**如果省略，默认为 "GET"**。                                                                           |
| `params`         | `object`  | 是       | 请求时需要发送的参数。对于 `GET` 请求，它们会作为查询字符串；对于 `POST` 请求，它们会作为请求体。                                                     |
| `qualityMapping` | `object`  | 否       | **音质映射表**。用于将应用内部的音质值（如 `"lossless"`）翻译成你的 API 需要的特定值。如果省略，则直接使用应用内部值。                            |
| `responseUrlPath`| `string`  | 是       | **URL提取路径**。用于从 API 返回的 JSON 响应中找到最终可播放的音乐链接。支持点 `.` 和方括号 `[]` 语法来访问嵌套对象和数组。                    |

#### 占位符

在 `params` 对象的值中，你可以使用以下占位符，程序在请求时会自动替换它们：

*   `{songId}`: 将被替换为当前歌曲的 ID。
*   `{quality}`: 将被替换为当前用户设置的音质字符串 (例如, `"higher"`, `"lossless"`)。

#### 音质值列表

应用内部使用的音质值如下，你可以在 `qualityMapping` 中使用它们作为**键**：
`standard`, `higher`, `exhigh`, `lossless`, `hires`, `jyeffect`, `sky`, `dolby`, `jymaster`

### 示例

假设有一个 API 如下：
`https://api.example.com/music?song_id=12345&bitrate=320000`
它返回的 JSON 是：
`{ "code": 200, "data": { "play_url": "http://..." } }`

那么对应的 JSON 配置文件应该是：

```json
{
    "name": "Example API",
    "apiUrl": "https://api.example.com/music",
    "method": "GET",
    "params": {
        "song_id": "{songId}",
        "bitrate": "{quality}"
     },
    "qualityMapping": {
        "higher": "128000",
        "exhigh": "320000",
        "lossless": "999000"
    },
    "responseUrlPath": "data.play_url"
}
```