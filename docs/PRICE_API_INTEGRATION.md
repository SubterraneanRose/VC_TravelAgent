# 费用估算 API 集成方案

## 当前实现状态

**现状：** 费用完全由 LLM 根据经验估算，没有实际数据支撑。

**问题：**
- 航班票价不准确（无法获取实时价格）
- 酒店价格不准确（无法获取实际房价）
- 景点门票价格可能过时
- 用户可能对估算价格产生误解

## 改进方案

### 方案 1：集成实际价格 API（推荐）

#### 1.1 航班价格 API

**可选服务：**
- **Amadeus API**（推荐）
  - 提供实时航班搜索和价格
  - 需要注册开发者账号
  - 有免费额度
  - 文档：https://developers.amadeus.com/

- **Skyscanner API**
  - 提供航班搜索
  - 需要申请 API Key
  - 文档：https://developers.skyscanner.net/

- **携程/去哪儿 API**（国内）
  - 国内航班数据更准确
  - 需要商务合作

**实现步骤：**
1. 在生成行程前，先调用航班 API 查询实际价格
2. 将实际价格传递给 LLM，或直接替换 LLM 估算的价格
3. 在 UI 中显示"实时价格"而非"估算价格"

#### 1.2 酒店价格 API

**可选服务：**
- **Booking.com API**
  - 需要申请合作伙伴账号
  - 提供酒店价格和可用性

- **Agoda API**
  - 需要商务合作

- **携程/去哪儿 API**（国内）
  - 国内酒店数据更准确

#### 1.3 景点门票价格 API

**可选服务：**
- **高德地图 POI 详情 API**
  - 可以获取部分景点的门票信息
  - 已集成高德地图，可复用

- **携程景点门票 API**
  - 需要商务合作

### 方案 2：混合方案（当前推荐）

**实现方式：**
1. **航班价格**：集成实际 API（最重要，价格波动大）
2. **酒店价格**：集成实际 API（重要，价格波动大）
3. **景点门票**：LLM 估算 + 标注"估算价格"（价格相对稳定）
4. **餐饮费用**：LLM 估算 + 标注"估算价格"（价格相对稳定）

**优势：**
- 关键费用（航班、酒店）使用实际数据
- 次要费用（门票、餐饮）使用估算，降低成本
- 平衡准确性和成本

### 方案 3：仅标注为估算（已实现）

**当前实现：**
- 所有费用标注为"估算"
- 在 UI 中明确提示用户这是估算价格
- 建议用户在实际预订前查询真实价格

**优势：**
- 实现简单，无需额外 API
- 成本低
- 用户明确知道这是估算

**劣势：**
- 价格可能不准确
- 用户体验一般

## 推荐实施路径

### 阶段 1：当前（已完成）
- ✅ 在 UI 中标注"估算价格"
- ✅ 在提示词中明确费用范围

### 阶段 2：集成航班价格 API（高优先级）
1. 选择 API 服务（推荐 Amadeus 或国内携程）
2. 创建 API 路由 `/api/flight-prices`
3. 在生成行程前查询航班价格
4. 将实际价格传递给 LLM 或直接替换

### 阶段 3：集成酒店价格 API（中优先级）
1. 选择 API 服务
2. 创建 API 路由 `/api/hotel-prices`
3. 在生成行程前查询酒店价格
4. 更新 UI 显示实际价格

### 阶段 4：优化（低优先级）
- 缓存价格数据，减少 API 调用
- 添加价格更新机制
- 显示价格来源和更新时间

## 代码示例：集成 Amadeus 航班 API

```typescript
// src/lib/flight-prices/amadeus.ts
export async function getFlightPrice(
  origin: string,
  destination: string,
  date: string
): Promise<number | null> {
  const apiKey = process.env.AMADEUS_API_KEY;
  if (!apiKey) return null;

  try {
    // 1. 获取访问令牌
    const tokenResponse = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${process.env.AMADEUS_API_SECRET}`,
    });
    const { access_token } = await tokenResponse.json();

    // 2. 搜索航班
    const flightResponse = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=1`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const data = await flightResponse.json();

    // 3. 返回最低价格
    if (data.data && data.data.length > 0) {
      return parseFloat(data.data[0].price.total);
    }
    return null;
  } catch (error) {
    console.error('获取航班价格失败:', error);
    return null;
  }
}
```

## 注意事项

1. **API 成本**：实际价格 API 通常有调用限制和费用
2. **响应时间**：API 调用会增加行程生成时间
3. **错误处理**：API 失败时应有降级方案（使用估算）
4. **数据缓存**：相同查询应缓存结果，避免重复调用
5. **用户隐私**：不要将 API Key 暴露给客户端

## 当前建议

**短期（已完成）：**
- ✅ 在 UI 中标注"估算价格"
- ✅ 在提示词中明确费用范围

**中期（可选）：**
- 集成航班价格 API（最重要）
- 集成酒店价格 API

**长期（可选）：**
- 集成景点门票 API
- 添加价格更新机制
- 显示价格来源和有效期

