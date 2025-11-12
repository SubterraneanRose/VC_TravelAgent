# LLM 联网搜索可行性分析

## 问题

能否改进提示词让大模型进行估算的时候进行联网搜索，以获取实时价格信息？

## 技术分析

### 1. LLM 联网搜索的两种方式

#### 方式 A：Function Calling / Tool Use（推荐）

**原理：**
- LLM 支持调用外部工具（如搜索 API）
- LLM 在生成过程中可以决定何时需要搜索
- 通过 function calling 机制，LLM 可以请求搜索，然后基于搜索结果继续生成

**优势：**
- LLM 可以自主决定何时需要搜索
- 更灵活，只在需要时搜索
- 符合 Agent 模式

**劣势：**
- 需要 LLM 支持 function calling
- 实现复杂度较高
- 可能增加 token 消耗

**阿里云百炼支持情况：**
- 需要查看 qwen 模型是否支持 function calling
- 如果使用 qwen-plus 或 qwen-max，可能支持工具调用
- 需要查看 DashScope API 文档

#### 方式 B：RAG（检索增强生成）

**原理：**
- 在调用 LLM 前，先通过搜索 API 获取相关信息
- 将搜索结果作为上下文传递给 LLM
- LLM 基于这些实时信息生成行程

**优势：**
- 实现简单，不依赖 LLM 的特殊能力
- 可以精确控制搜索内容
- 适用于所有 LLM

**劣势：**
- 需要预先知道要搜索什么
- 可能搜索不必要的信息
- 增加 API 调用次数和成本

### 2. 当前实现（阿里云百炼 qwen-turbo）

**当前模型：** `qwen-turbo`

**能力限制：**
- qwen-turbo 可能不支持 function calling
- 需要通过 RAG 方式实现联网搜索

**建议方案：**
1. **升级模型**（如果支持）：使用 qwen-plus 或 qwen-max，可能支持工具调用
2. **RAG 方式**（当前可行）：在调用 LLM 前先搜索，然后将结果作为上下文

## 实现方案

### 方案 1：RAG 方式（推荐，当前可行）

**实现步骤：**

1. **集成搜索 API**
   ```typescript
   // src/lib/search/web-search.ts
   export async function searchFlightPrice(
     origin: string,
     destination: string,
     date: string
   ): Promise<string> {
     // 调用搜索 API（如 Google Search、Bing Search、或国内搜索引擎）
     // 返回搜索结果摘要
   }
   ```

2. **在生成行程前搜索关键信息**
   ```typescript
   // src/app/api/generate-itinerary/route.ts
   const searchResults = await Promise.all([
     searchFlightPrice(params.origin, params.destination, params.startDate),
     searchHotelPrice(params.destination, params.startDate),
     // ... 其他搜索
   ]);
   ```

3. **将搜索结果整合到提示词中**
   ```typescript
   const prompt = buildItineraryPrompt(params, searchResults);
   ```

4. **更新提示词模板**
   ```typescript
   // 在提示词中添加搜索结果作为参考
   **实时价格参考（来自网络搜索）：**
   - 航班价格：${flightPriceInfo}
   - 酒店价格：${hotelPriceInfo}
   - ...
   
   请基于以上实时价格信息生成行程，确保费用估算尽可能准确。
   ```

### 方案 2：Function Calling（如果 LLM 支持）

**实现步骤：**

1. **检查 qwen 模型是否支持 function calling**
   - 查看 DashScope API 文档
   - 如果支持，使用 qwen-plus 或 qwen-max

2. **定义搜索工具**
   ```typescript
   const tools = [
     {
       type: 'function',
       function: {
         name: 'search_flight_price',
         description: '搜索航班实时价格',
         parameters: {
           type: 'object',
           properties: {
             origin: { type: 'string' },
             destination: { type: 'string' },
             date: { type: 'string' },
           },
         },
       },
     },
   ];
   ```

3. **在 LLM 调用中启用工具**
   ```typescript
   body: JSON.stringify({
     model: 'qwen-plus',
     input: {
       messages: [...],
     },
     parameters: {
       tools: tools,
       tool_choice: 'auto', // 让 LLM 决定何时使用工具
     },
   }),
   ```

4. **处理工具调用响应**
   - LLM 返回工具调用请求
   - 执行搜索
   - 将搜索结果返回给 LLM
   - LLM 基于结果继续生成

### 方案 3：混合方案（平衡准确性和成本）

**策略：**
- **关键信息主动搜索**：航班、酒店价格（价格波动大）
- **次要信息 LLM 估算**：景点门票、餐饮（价格相对稳定）
- **提示词引导**：让 LLM 知道哪些信息已搜索，哪些需要估算

## 搜索 API 选择

### 1. Google Search API
- **优势**：搜索结果质量高，覆盖面广
- **劣势**：需要 API Key，国内访问可能受限
- **适用**：国际航班、国际酒店

### 2. Bing Search API
- **优势**：微软提供，稳定性好
- **劣势**：需要 API Key
- **适用**：通用搜索

### 3. 国内搜索引擎 API
- **百度搜索 API**：国内信息更准确
- **360 搜索 API**：备选方案
- **适用**：国内航班、国内酒店、国内景点

### 4. 专业旅行 API（更准确）
- **Amadeus API**：航班价格（最准确）
- **Booking.com API**：酒店价格
- **携程 API**：国内旅行信息
- **适用**：需要准确价格时

## 成本分析

### RAG 方式成本
- **搜索 API 调用**：每次行程生成需要 2-5 次搜索
- **LLM Token 增加**：搜索结果会增加 prompt 长度
- **总成本**：中等（搜索 API + 增加的 LLM token）

### Function Calling 方式成本
- **LLM Token**：工具调用会增加 token 消耗
- **搜索 API 调用**：只在 LLM 认为需要时调用
- **总成本**：可能更低（更智能的搜索时机）

## 推荐实施路径

### 阶段 1：验证可行性（当前）
1. ✅ 在提示词中明确说明这是估算价格
2. ✅ 在 UI 中标注"估算价格"

### 阶段 2：RAG 方式实现（推荐）
1. 集成搜索 API（推荐 Google Search 或百度搜索）
2. 在生成行程前搜索航班和酒店价格
3. 将搜索结果整合到提示词中
4. 更新提示词，让 LLM 基于实时信息生成

### 阶段 3：优化（可选）
1. 如果 qwen 模型支持，升级到 function calling 方式
2. 添加搜索结果缓存
3. 优化搜索策略，减少不必要的搜索

## 代码示例：RAG 方式实现

```typescript
// src/lib/search/web-search.ts
export async function searchWeb(query: string): Promise<string> {
  // 使用 Google Search API 或百度搜索 API
  const apiKey = process.env.SEARCH_API_KEY;
  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  
  // 提取前 3 个结果的摘要
  return data.items?.slice(0, 3).map((item: any) => 
    `${item.title}: ${item.snippet}`
  ).join('\n') || '未找到相关信息';
}

// src/app/api/generate-itinerary/route.ts
export async function POST(request: NextRequest) {
  const params = await request.json();
  
  // 搜索关键信息
  const flightQuery = `${params.origin} 到 ${params.destination} ${params.startDate} 航班价格`;
  const hotelQuery = `${params.destination} ${params.startDate} 酒店价格`;
  
  const [flightInfo, hotelInfo] = await Promise.all([
    searchWeb(flightQuery),
    searchWeb(hotelQuery),
  ]);
  
  // 将搜索结果传递给提示词
  const prompt = buildItineraryPrompt(params, {
    flightPriceInfo: flightInfo,
    hotelPriceInfo: hotelInfo,
  });
  
  // ... 调用 LLM
}
```

## 结论

**当前可行性：**
- ✅ **RAG 方式**：完全可行，不依赖 LLM 特殊能力
- ❓ **Function Calling**：需要验证 qwen 模型是否支持

**推荐方案：**
- **短期**：使用 RAG 方式，在生成行程前搜索关键价格信息
- **长期**：如果 LLM 支持，升级到 function calling 方式，更智能灵活

**关键点：**
- 仅通过提示词**无法**让 LLM 直接联网搜索
- 需要**外部搜索 API** + **RAG 或 Function Calling** 机制
- RAG 方式实现简单，当前即可实施

