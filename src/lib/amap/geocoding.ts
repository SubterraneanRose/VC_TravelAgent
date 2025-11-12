'use client';

/**
 * 清理和规范化地址字符串
 */
function normalizeAddress(address: string): string {
  // 规范化空格：多个空格合并为一个，但保留地址结构
  let normalized = address.trim().replace(/\s+/g, ' ');
  
  // 移除括号内的内容（如"（约6小时车程）"）
  normalized = normalized.replace(/[（(].*?[）)]/g, '');
  
  // 处理路线描述（如"喀纳斯村至贾登峪"、"乌鲁木齐至喀纳斯"），提取起点
  if (normalized.includes('至') || normalized.includes('到')) {
    const parts = normalized.split(/[至到]/);
    if (parts.length > 0 && parts[0].trim()) {
      normalized = parts[0].trim();
    }
  }
  
  // 处理模糊地址（如"民宿内"、"餐厅内"、"景区内或周边村庄"）
  if (normalized.includes('内') || normalized.includes('或') || normalized.includes('周边')) {
    // 如果包含"或"，尝试提取第一个选项
    if (normalized.includes('或')) {
      const parts = normalized.split('或');
      if (parts.length > 0 && parts[0].trim()) {
        normalized = parts[0].trim();
      }
    }
    // 如果包含"周边"，移除"周边"及其后面的内容
    if (normalized.includes('周边')) {
      normalized = normalized.split('周边')[0].trim();
    }
    // 如果包含"内"且长度较短，可能是"XX内"格式
    if (normalized.includes('内') && normalized.length < 10) {
      return normalized;
    }
  }
  
  return normalized;
}

/**
 * 尝试使用更通用的地址进行地理编码
 * 例如："新疆阿勒泰地区布尔津县喀纳斯村" -> "新疆阿勒泰地区布尔津县喀纳斯"
 */
function getFallbackAddresses(address: string): string[] {
  const fallbacks: string[] = [];
  
  // 移除最后的"村"、"镇"、"乡"等，尝试更通用的地址
  const patterns = [
    /(.+?)(村|镇|乡|县|市|区)$/,
    /(.+?)(村|镇|乡)$/,
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match && match[1]) {
      fallbacks.push(match[1]);
    }
  }
  
  // 如果地址包含具体名称（如"喀纳斯餐厅"），尝试只保留行政区划
  // 匹配：省+市+区/县+镇/乡/村
  const adminMatch = address.match(/(.+?省)?(.+?市)?(.+?地区)?(.+?县)(.+?[镇乡村])/);
  if (adminMatch) {
    const adminParts = adminMatch.slice(1).filter(Boolean);
    if (adminParts.length > 0) {
      fallbacks.push(adminParts.join(''));
    }
  }
  
  return fallbacks;
}

/**
 * 延迟函数，用于控制请求频率
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 执行单次地理编码请求
 */
async function geocodeSingle(address: string, apiKey: string, retryCount = 0): Promise<{ lat: number; lng: number } | null> {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${apiKey}&address=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  
  // 处理 API 限流错误（错误码 10021 - 超过并发量限制：3 次/秒）
  if (data.infocode === '10021' || data.info?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT')) {
    if (retryCount < 3) {
      // 指数退避：第1次重试等待400ms，第2次800ms，第3次1600ms
      // 确保重试间隔足够长，避免再次触发限流
      const waitTime = 400 * Math.pow(2, retryCount);
      console.warn(`⚠️ API 限流（超过 3 次/秒限制），等待 ${waitTime}ms 后重试 (${retryCount + 1}/3):`, address);
      await delay(waitTime);
      return geocodeSingle(address, apiKey, retryCount + 1);
    } else {
      console.error('❌ API 限流，已达到最大重试次数:', address);
      return null;
    }
  }
  
  if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
    const location = data.geocodes[0].location.split(',');
    return {
      lng: parseFloat(location[0]),
      lat: parseFloat(location[1]),
    };
  }
  
  return null;
}

/**
 * 使用高德地图地理编码 API 将地址转换为坐标
 * 支持多级回退策略以提高成功率
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // 优先使用 Web 服务专用的 Key，如果没有则使用通用的 Key
  const apiKey = process.env.NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY || process.env.NEXT_PUBLIC_AMAP_API_KEY;
  
  if (!apiKey) {
    console.warn('高德地图 API Key 未配置');
    return null;
  }

  // 规范化地址
  const normalized = normalizeAddress(address);
  
  // 如果规范化后地址为空或太短，直接返回
  if (!normalized || normalized.length < 2) {
    console.warn('地址太短或无效:', address);
    return null;
  }

  try {
    // 第一轮：尝试原始规范化地址
    let coords = await geocodeSingle(normalized, apiKey);
    
    if (coords) {
      return coords;
    }
    
    // 第二轮：如果失败，尝试备用地址
    const fallbacks = getFallbackAddresses(normalized);
    for (const fallback of fallbacks) {
      if (fallback && fallback !== normalized) {
        // 备用地址请求也需要延迟（遵守高德地图 3 次/秒的并发量限制）
        await delay(350);
        coords = await geocodeSingle(fallback, apiKey);
        if (coords) {
          return coords;
        }
      }
    }
    
    // 所有尝试都失败
    return null;
    
  } catch (error: any) {
    console.error('地理编码异常:', address, error.message);
    return null;
  }
}

