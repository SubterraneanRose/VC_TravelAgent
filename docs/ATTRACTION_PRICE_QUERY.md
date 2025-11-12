# 景点门票价格查询机制

## 概述

本系统实现了通过 LLM 查询景点门票价格的机制，在生成行程规划时，会先查询景点的实际门票价格，然后基于这些价格信息生成更准确的行程计划。

## 工作流程

### 两阶段生成方案

1. **第一阶段：获取景点列表**
   - 调用 LLM，根据旅行信息（目的地、天数、偏好等）列出可能访问的主要景点
   - 返回景点名称列表（JSON 格式）

2. **第二阶段：查询景点价格**
   - 对每个景点，调用专门的 LLM 查询函数获取门票价格
   - 查询结果包括：
     - 是否免费
     - 门票价格（人民币）
     - 信息来源

3. **第三阶段：生成完整行程**
   - 将查询到的价格信息整合到提示词中
   - LLM 基于实际价格信息生成完整行程
   - 确保景点费用使用查询到的实际价格，而不是经验估算

## 实现细节

### 文件结构

```
src/
├── lib/
│   ├── llm/
│   │   ├── price-query.ts          # LLM 价格查询函数
│   │   └── prompts.ts               # 提示词构建（包含价格信息）
│   └── search/
│       └── attraction-prices.ts     # 价格搜索接口（可扩展）
└── app/
    └── api/
        └── generate-itinerary/
            └── route.ts             # 行程生成 API（实现两阶段方案）
```

### 核心函数

#### 1. `getAttractionList(params)`
- 位置：`src/app/api/generate-itinerary/route.ts`
- 功能：获取可能访问的景点列表
- 返回：景点名称数组

#### 2. `queryAttractionPriceWithLLM(attractionName, destination)`
- 位置：`src/lib/llm/price-query.ts`
- 功能：使用 LLM 查询单个景点的门票价格
- 返回：`{ price: number | null, isFree: boolean }`

#### 3. `buildItineraryPrompt(params)`
- 位置：`src/lib/llm/prompts.ts`
- 功能：构建包含价格信息的提示词
- 特点：如果提供了 `attractionPrices`，会在提示词中包含价格参考信息

## 使用示例

### API 调用

```typescript
POST /api/generate-itinerary
{
  "destination": "莫斯科",
  "origin": "南京",
  "startDate": "2024-06-01",
  "endDate": "2024-06-07",
  "days": 7,
  "budget": 20000,
  "preferences": ["文化", "历史"],
  "people": 2
}
```

### 处理流程

1. **获取景点列表**
   ```
   LLM 返回：
   {
     "attractions": [
       "红场",
       "莫斯科克里姆林宫",
       "圣瓦西里大教堂",
       "冬宫博物馆"
     ]
   }
   ```

2. **查询价格**
   ```
   查询 "红场" -> { price: 0, isFree: true }
   查询 "莫斯科克里姆林宫" -> { price: 500, isFree: false }
   查询 "圣瓦西里大教堂" -> { price: 300, isFree: false }
   查询 "冬宫博物馆" -> { price: 600, isFree: false }
   ```

3. **生成行程**
   - 提示词中包含价格参考信息
   - LLM 生成行程时，使用查询到的实际价格

## 优化建议

### 1. 缓存机制
- 对查询到的价格进行缓存，避免重复查询
- 可以使用 Redis 或数据库存储价格信息
- 设置合理的缓存过期时间（如 30 天）

### 2. 多数据源
- 当前仅使用 LLM 查询，可以扩展为：
  - 集成携程/去哪儿等旅行网站的 API
  - 使用 Google Search API 或百度搜索 API
  - 维护一个景点价格数据库

### 3. 价格更新
- 定期更新价格信息
- 考虑季节性价格波动
- 提供价格更新时间戳

### 4. 错误处理
- 如果价格查询失败，回退到经验估算
- 记录查询失败的景点，便于后续优化

### 5. 性能优化
- 并发查询多个景点价格（注意 API 限流）
- 使用 Promise.all 并行处理（需要控制并发数）
- 添加请求重试机制

## 未来扩展

### 集成真实搜索 API

```typescript
// 示例：集成 Google Search API
async function queryPriceWithGoogleSearch(
  attractionName: string,
  destination: string
): Promise<{ price: number | null; isFree: boolean } | null> {
  // 1. 调用 Google Search API
  // 2. 获取搜索结果
  // 3. 使用 LLM 从搜索结果中提取价格
  // 4. 返回价格信息
}
```

### 维护价格数据库

```sql
CREATE TABLE attraction_prices (
  id UUID PRIMARY KEY,
  attraction_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  price DECIMAL(10, 2),
  is_free BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'CNY',
  source TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(attraction_name, destination)
);
```

## 注意事项

1. **API 限流**：查询价格时添加延迟（500ms），避免超过 API 限流
2. **成本控制**：每次生成行程会调用多次 LLM（景点列表 + 价格查询 + 行程生成），注意控制成本
3. **准确性**：LLM 查询的价格可能不准确，建议标注为"估算价格"
4. **用户体验**：价格查询会增加生成时间，建议在前端显示进度

## 相关文档

- [LLM Web Search 分析](./LLM_WEB_SEARCH_ANALYSIS.md)
- [价格 API 集成计划](./PRICE_API_INTEGRATION.md)

