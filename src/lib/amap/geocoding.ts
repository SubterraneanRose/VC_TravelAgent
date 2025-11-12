'use client';

/**
 * 提取中文名称（从混合语言地址中提取）
 * 例如："红场 Красная площадь, Москва, Россия" -> "红场"
 * 例如："莫斯科中央酒店 ул. Никольская, д. 15, Москва, Россия" -> "莫斯科中央酒店"
 */
function extractChineseName(address: string): string | null {
  // 方法1：提取地址开头的连续中文部分（直到遇到非中文字符）
  // 例如："红场 Красная" -> "红场"
  // 例如："莫斯科中央酒店 ул." -> "莫斯科中央酒店"
  const startChineseMatch = address.match(/^([\u4e00-\u9fa5]+(?:\s+[\u4e00-\u9fa5]+)*)/);
  if (startChineseMatch && startChineseMatch[1]) {
    const chinesePart = startChineseMatch[1].trim();
    if (chinesePart.length >= 2 && chinesePart.length <= 20) {
      return chinesePart;
    }
  }
  
  // 方法2：如果方法1失败，提取所有中文词组，取最长的
  const chineseMatches = address.match(/[\u4e00-\u9fa5]+/g);
  if (chineseMatches && chineseMatches.length > 0) {
    // 找到最长的中文词组
    let longest = '';
    for (const match of chineseMatches) {
      if (match.length > longest.length && match.length <= 20) {
        longest = match;
      }
    }
    if (longest.length >= 2) {
      return longest;
    }
  }
  
  return null;
}

/**
 * 提取城市名称（从模糊地址中提取）
 * 例如："莫斯科市中心" -> "莫斯科"
 *       "圣彼得堡市中心" -> "圣彼得堡"
 */
function extractCityName(address: string): string | null {
  // 匹配城市名称（中文城市名，通常在"市中心"、"市区"、"郊外"等词之前）
  const cityMatch = address.match(/([\u4e00-\u9fa5]+?)(市中心|市区|郊外|市|市辖区)/);
  if (cityMatch && cityMatch[1]) {
    return cityMatch[1];
  }
  
  // 如果没有匹配到，尝试提取所有中文字符作为城市名
  const allChinese = address.match(/[\u4e00-\u9fa5]+/g);
  if (allChinese && allChinese.length > 0) {
    // 取第一个中文词组作为城市名
    return allChinese[0];
  }
  
  return null;
}

/**
 * 处理交通路线，提取起点或终点城市
 * 例如："莫斯科至圣彼得堡火车 莫斯科火车站 - 圣彼得堡火车站" -> "莫斯科"
 */
function extractRouteCity(address: string): string | null {
  // 提取"XX至XX"或"XX到XX"中的起点
  const routeMatch = address.match(/([\u4e00-\u9fa5]+?)[至到]([\u4e00-\u9fa5]+)/);
  if (routeMatch && routeMatch[1]) {
    return routeMatch[1];
  }
  
  // 提取"XX - XX"格式中的起点（中文城市名）
  const dashMatch = address.match(/([\u4e00-\u9fa5]+?)\s*[-－]\s*([\u4e00-\u9fa5]+)/);
  if (dashMatch && dashMatch[1]) {
    return dashMatch[1];
  }
  
    return null;
  }

/**
 * 清理和规范化地址字符串
 */
function normalizeAddress(address: string): string {
  // 规范化空格：多个空格合并为一个，但保留地址结构
  let normalized = address.trim().replace(/\s+/g, ' ');
  
  // 移除括号内的内容（如"（约6小时车程）"、"（如：革命广场站）"）
  normalized = normalized.replace(/[（(].*?[）)]/g, '');
  
  // 处理交通路线（如"莫斯科至圣彼得堡火车"、"南京至莫斯科国际航班"）
  // 优先提取起点城市
  const routeCity = extractRouteCity(normalized);
  if (routeCity) {
    // 如果提取到城市名，尝试使用"城市名 + 中文名称"的组合
    const chineseName = extractChineseName(normalized);
    if (chineseName && chineseName !== routeCity) {
      // 例如："南京至莫斯科国际航班" -> "南京 国际机场"
      if (normalized.includes('机场')) {
        return `${routeCity} 国际机场`;
      } else if (normalized.includes('火车站') || normalized.includes('车站')) {
        return `${routeCity} 火车站`;
      }
    }
    return routeCity;
  }
  
  // 处理模糊地址（如"莫斯科市中心"、"圣彼得堡市中心"）
  if (normalized.includes('市中心') || normalized.includes('市区') || normalized.includes('郊外')) {
    const cityName = extractCityName(normalized);
    if (cityName) {
      // 如果有中文名称，尝试组合
      const chineseName = extractChineseName(normalized);
      if (chineseName && chineseName !== cityName) {
        // 例如："红场 莫斯科市中心" -> "红场 莫斯科"
        return `${chineseName} ${cityName}`;
      }
      // 否则只返回城市名
      return cityName;
    }
  }
  
  // 处理混合语言地址（中文+俄语）
  // 例如："红场 Красная площадь, Москва, Россия" -> "红场"
  // 例如："莫斯科中央酒店 ул. Никольская, д. 15, Москва, Россия" -> "莫斯科中央酒店"
  const chineseName = extractChineseName(normalized);
  if (chineseName) {
    // 如果中文名称是城市名，尝试添加更具体的描述
    const cityName = extractCityName(normalized);
    if (cityName && chineseName !== cityName) {
      // 如果中文名称不是城市名，可能是景点/酒店名称，直接使用
      // 例如："红场"、"克里姆林宫"、"莫斯科中央酒店"
      return chineseName;
    } else if (cityName) {
      // 如果只有城市名，返回城市名
      return cityName;
    } else {
      // 如果提取到中文名称，直接使用
      return chineseName;
    }
  }
  
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
 * 例如："红场" -> ["莫斯科 红场", "莫斯科"]
 * 例如："莫斯科市中心" -> ["莫斯科"]
 */
function getFallbackAddresses(address: string): string[] {
  const fallbacks: string[] = [];
  
  // 提取中文名称和城市名
  const chineseName = extractChineseName(address);
  const cityName = extractCityName(address);
  
  // 如果有中文名称和城市名，尝试组合
  if (chineseName && cityName && chineseName !== cityName) {
    // 例如："红场 莫斯科市中心" -> ["红场 莫斯科", "莫斯科"]
    fallbacks.push(`${chineseName} ${cityName}`);
    fallbacks.push(cityName);
  } else if (cityName) {
    // 如果只有城市名，直接使用
    fallbacks.push(cityName);
  } else if (chineseName) {
    // 如果只有中文名称，尝试添加常见城市后缀
    // 例如："红场" -> ["红场 莫斯科", "莫斯科"]
    // 但这里我们不知道城市，所以只返回名称本身
    fallbacks.push(chineseName);
  }
  
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
  
  // 去重
  return [...new Set(fallbacks)];
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
 * 检测是否是外国城市（高德地图主要支持中国境内地址）
 */
function isForeignCity(address: string): boolean {
  // 常见外国城市名称列表（可以根据需要扩展）
  const foreignCities = [
    '莫斯科', '圣彼得堡', '俄罗斯',
    '东京', '大阪', '京都', '日本', '九州', '福冈', '熊本', '鹿儿岛', '长崎', '大分', '宫崎', '佐贺',
    '名古屋', '横滨', '神户', '札幌', '仙台', '广岛', '冲绳', '那霸',
    '纽约', '洛杉矶', '旧金山', '美国',
    '巴黎', '伦敦', '柏林', '罗马', '欧洲',
    '首尔', '韩国',
    '曼谷', '清迈', '泰国',
    '新加坡', '马来西亚', '印度尼西亚',
    '悉尼', '墨尔本', '澳大利亚',
    '多伦多', '温哥华', '加拿大',
  ];
  
  // 检查地址中是否包含外国城市名称
  for (const city of foreignCities) {
    if (address.includes(city)) {
      return true;
    }
  }
  
  // 检查是否包含俄语、日语、韩语等非中文字符（但排除英文，因为中国城市也可能有英文）
  // 俄语字符范围：\u0400-\u04FF
  // 日语字符范围：\u3040-\u309F (平假名), \u30A0-\u30FF (片假名)
  // 韩语字符范围：\uAC00-\uD7AF
  const foreignCharPattern = /[\u0400-\u04FF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
  if (foreignCharPattern.test(address)) {
    return true;
  }
  
  return false;
}

/**
 * 使用高德地图地理编码 API 将地址转换为坐标
 * 支持多级回退策略以提高成功率
 * 注意：高德地图主要支持中国境内地址，外国城市可能无法编码
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
    // 静默失败，不输出警告（可能是模糊地址）
    return null;
  }

  // 检测是否是外国城市
  if (isForeignCity(normalized)) {
    // 高德地图主要支持中国境内地址，外国城市无法编码
    // 静默返回 null，不输出警告
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
      // 检查备用地址是否也是外国城市
      if (isForeignCity(fallback)) {
        continue; // 跳过外国城市
      }
      
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

