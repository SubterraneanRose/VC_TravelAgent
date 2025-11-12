'use server';

import { callLLM } from './client';

/**
 * 使用 LLM 查询景点门票价格
 * 这是一个专门用于查询价格的 LLM 调用
 */
export async function queryAttractionPriceWithLLM(
  attractionName: string,
  destination: string
): Promise<{ price: number | null; isFree: boolean; currency?: string } | null> {
  try {
    const prompt = `请查询以下景点的门票价格信息（必须搜索实际价格，不要猜测）：

景点名称：${attractionName}
所在地区：${destination}

**重要要求（必须严格遵守）：**
1. **必须基于实际知识或搜索结果提供价格，不要根据价格范围猜测**
2. **如果无法确定准确价格，必须返回 null，绝对不要猜测或高估**
3. **严禁将价格设置为 1200 元/人这样的天价，除非你100%确定这是实际价格**
4. 大多数景点的门票价格在 50-500 元/人之间，超过 500 元/人的景点非常罕见
5. 世界著名景点（如莫斯科克里姆林宫、冬宫博物馆）的门票价格通常在 200-800 元/人之间，极少超过 1000 元/人
6. 如果景点免费，请明确标记为免费

**价格参考范围（人民币/人，仅供参考，不要据此猜测）：**
- 免费景点：0 元
- 普通景点：50-200 元
- 著名景点：200-500 元
- 世界级景点（如克里姆林宫、冬宫）：300-800 元（极少超过 800 元）
- 超过 1000 元/人的景点极其罕见，必须谨慎确认

**查询原则：**
- 优先使用你的知识库中的实际价格信息
- 如果知识库中没有，返回 null，不要猜测
- 绝对不要为了"填满价格范围"而设置不合理的高价

请以 JSON 格式回答：
{
  "isFree": true/false,
  "price": 价格数字（如果是免费则为0，如果无法确定则为null，必须是实际价格，不要高估）,
  "currency": "CNY",
  "note": "价格说明或信息来源"
}

如果无法确定价格，请返回：
{
  "isFree": null,
  "price": null,
  "currency": "CNY",
  "note": "无法确定价格"
}`;

    const response = await callLLM({
      prompt,
      maxTokens: 500,
      temperature: 0.3, // 降低温度，让回答更准确
    });

    // 尝试解析 JSON
    let jsonStr = response.content.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || 
                     jsonStr.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const data = JSON.parse(jsonStr);
    
    return {
      price: data.isFree ? 0 : (data.price || null),
      isFree: data.isFree === true,
    };
  } catch (error: any) {
    console.error('LLM 查询景点价格失败:', attractionName, error);
    return null;
  }
}

