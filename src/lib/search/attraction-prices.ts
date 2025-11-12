'use server';

/**
 * 搜索景点门票价格
 * 使用 LLM 查询景点的实际门票价格信息
 * 
 * 注意：这个函数已被 queryAttractionPriceWithLLM 替代
 * 保留此文件是为了未来可能的扩展（如集成真实的搜索 API）
 */
export async function searchAttractionPrice(
  attractionName: string,
  destination: string
): Promise<{ price: number | null; isFree: boolean; source: string } | null> {
  // 这里可以使用多种搜索方式：
  // 1. Google Search API
  // 2. 百度搜索 API
  // 3. 携程/去哪儿等旅行网站的 API
  // 4. 或者使用 LLM 专门查询价格信息

  // 当前方案：使用 LLM 专门查询价格（推荐，因为不需要额外的搜索 API）
  // 实际实现在 src/lib/llm/price-query.ts 中
  try {
    const { queryAttractionPriceWithLLM } = await import('../llm/price-query');
    const priceInfo = await queryAttractionPriceWithLLM(attractionName, destination);
    
    if (priceInfo) {
      return {
        price: priceInfo.price,
        isFree: priceInfo.isFree,
        source: 'LLM查询',
      };
    }
    
    return null;
  } catch (error) {
    console.error('搜索景点价格失败:', attractionName, error);
    return null;
  }
}

/**
 * 批量搜索多个景点的门票价格
 */
export async function searchMultipleAttractionPrices(
  attractions: string[],
  destination: string
): Promise<Map<string, { price: number | null; isFree: boolean; source: string }>> {
  const results = new Map<string, { price: number | null; isFree: boolean; source: string }>();

  // 并发搜索，但添加延迟避免 API 限流
  for (let i = 0; i < attractions.length; i++) {
    if (i > 0) {
      // 延迟 500ms，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const attraction = attractions[i];
    const priceInfo = await searchAttractionPrice(attraction, destination);
    if (priceInfo) {
      results.set(attraction, priceInfo);
    }
  }

  return results;
}

