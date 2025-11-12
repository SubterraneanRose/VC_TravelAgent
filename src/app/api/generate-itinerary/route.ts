import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '../../../lib/llm/client';
import { buildItineraryPrompt } from '../../../lib/llm/prompts';
import type { TripGenerationParams, AttractionPriceInfo } from '../../../lib/llm/prompts';
import { queryAttractionPriceWithLLM } from '../../../lib/llm/price-query';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params: TripGenerationParams = {
      destination: body.destination,
      origin: body.origin || null,
      destinationEnd: body.destinationEnd || null,
      startDate: body.startDate,
      endDate: body.endDate,
      days: body.days,
      budget: body.budget,
      preferences: body.preferences || [],
      people: body.people || 2,
    };

    // 验证必需参数
    if (!params.destination || !params.startDate || !params.endDate || !params.days) {
      return NextResponse.json(
        { error: '缺少必需参数：destination, startDate, endDate, days' },
        { status: 400 }
      );
    }

    // 第一阶段：获取可能访问的景点列表
    const attractions = await getAttractionList(params);
    
    // 第二阶段：查询景点价格
    const attractionPrices: AttractionPriceInfo[] = [];
    if (attractions.length > 0) {
      console.log(`开始查询 ${attractions.length} 个景点的门票价格...`);
      for (let i = 0; i < attractions.length; i++) {
        const attraction = attractions[i];
        // 添加延迟，避免 API 限流
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const priceInfo = await queryAttractionPriceWithLLM(attraction, params.destination);
        if (priceInfo) {
          attractionPrices.push({
            name: attraction,
            price: priceInfo.price,
            isFree: priceInfo.isFree,
            source: 'LLM查询',
          });
          console.log(`查询到价格: ${attraction} - ${priceInfo.isFree ? '免费' : `¥${priceInfo.price}`}`);
        } else {
          console.log(`未查询到价格: ${attraction}`);
        }
      }
      console.log(`价格查询完成，共查询到 ${attractionPrices.length} 个景点的价格信息`);
    }

    // 将价格信息添加到参数中
    params.attractionPrices = attractionPrices;

    // 构建提示词（包含价格信息）
    const prompt = buildItineraryPrompt(params);

    // 调用 LLM
    const llmResponse = await callLLM({
      prompt,
      maxTokens: 4000, // 增加 token 限制，避免 JSON 被截断
      temperature: 0.7,
    });

    // 尝试解析 JSON（LLM 可能返回带 markdown 代码块的 JSON）
    let itineraryData;
    try {
      let jsonStr = llmResponse.content;
      
      // 尝试提取 JSON（可能被 ```json 包裹）
      // 使用贪婪匹配，找到最后一个完整的代码块
      let jsonMatch = jsonStr.match(/```json\s*([\s\S]*)\s*```/);
      if (!jsonMatch) {
        jsonMatch = jsonStr.match(/```\s*([\s\S]*)\s*```/);
      }
      
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      } else {
        // 如果没有代码块标记，尝试直接查找 JSON 对象
        // 查找第一个 { 到最后一个 } 之间的内容
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
      }
      
      // 清理可能的空白字符
      jsonStr = jsonStr.trim();
      
      // 如果 JSON 被截断，尝试修复（查找最后一个完整的对象）
      if (!jsonStr.endsWith('}')) {
        // 尝试找到最后一个完整的 JSON 对象
        const lastCompleteBrace = jsonStr.lastIndexOf('}');
        if (lastCompleteBrace > 0) {
          // 检查是否是完整的结构
          const beforeBrace = jsonStr.substring(0, lastCompleteBrace + 1);
          
          // 计算大括号匹配
          let openBraces = 0;
          let closeBraces = 0;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < beforeBrace.length; i++) {
            const char = beforeBrace[i];
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === '{') openBraces++;
              if (char === '}') closeBraces++;
            }
          }
          
          if (openBraces === closeBraces) {
            // 检查是否需要补全数组
            const hasDays = beforeBrace.includes('"days"');
            const hasDaysArray = beforeBrace.includes('"days"') && beforeBrace.includes('[');
            const lastBracket = beforeBrace.lastIndexOf(']');
            const lastBracePos = beforeBrace.lastIndexOf('}');
            
            if (hasDays && lastBracket < lastBracePos) {
              // days 数组可能未闭合
              jsonStr = beforeBrace + ']}';
            } else {
              jsonStr = beforeBrace + '}';
            }
          } else {
            // 大括号不匹配，尝试补全
            const missingBraces = openBraces - closeBraces;
            jsonStr = beforeBrace + '}'.repeat(missingBraces);
          }
        }
      }
      
      itineraryData = JSON.parse(jsonStr);
    } catch (parseError: any) {
      // 如果解析失败，尝试更宽松的解析
      console.error('LLM 返回内容解析失败:', parseError.message);
      console.error('原始内容长度:', llmResponse.content.length);
      console.error('原始内容前1000字符:', llmResponse.content.substring(0, 1000));
      
      // 尝试更宽松的解析：直接查找 JSON 对象
      try {
        // 查找第一个 { 到最后一个 } 之间的内容
        const firstBrace = llmResponse.content.indexOf('{');
        const lastBrace = llmResponse.content.lastIndexOf('}');
        
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          let extractedJson = llmResponse.content.substring(firstBrace, lastBrace + 1);
          
          // 尝试修复可能的截断问题
          // 检查大括号是否匹配
          let openCount = 0;
          let closeCount = 0;
          for (const char of extractedJson) {
            if (char === '{') openCount++;
            if (char === '}') closeCount++;
          }
          
          // 如果缺少闭合大括号，尝试补全
          if (openCount > closeCount) {
            extractedJson += '}'.repeat(openCount - closeCount);
          }
          
          itineraryData = JSON.parse(extractedJson);
        } else {
          throw new Error('无法找到有效的 JSON 对象');
        }
      } catch (secondTryError: any) {
        console.error('第二次解析尝试也失败:', secondTryError.message);
        console.error('原始内容后1000字符:', llmResponse.content.substring(Math.max(0, llmResponse.content.length - 1000)));
        
        return NextResponse.json(
          { 
            error: 'LLM 返回格式不正确，无法解析 JSON',
            parseError: parseError.message,
            secondTryError: secondTryError.message,
            rawContentLength: llmResponse.content.length,
            rawContentPreview: llmResponse.content.substring(0, 1000),
            rawContentSuffix: llmResponse.content.substring(Math.max(0, llmResponse.content.length - 500)),
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: itineraryData,
      usage: llmResponse.usage,
      attractionPrices: attractionPrices, // 返回查询到的价格信息，供前端显示
    });
  } catch (error: any) {
    console.error('生成行程失败:', error);
    return NextResponse.json(
      { error: error.message || '生成行程失败' },
      { status: 500 }
    );
  }
}

/**
 * 第一阶段：获取可能访问的景点列表
 * 让 LLM 先列出可能访问的景点，不生成完整行程
 */
async function getAttractionList(params: TripGenerationParams): Promise<string[]> {
  try {
    const { destination, origin, destinationEnd, startDate, endDate, days, preferences, people = 2 } = params;
    
    const preferencesText = preferences.length > 0 
      ? preferences.join('、')
      : '无特殊偏好';

    const originText = origin ? `从 ${origin} 出发，` : '';
    const destinationEndText = destinationEnd ? `，最终返回 ${destinationEnd}` : '';

    const prompt = `你是一位专业的旅行规划师。请根据以下信息，列出在 ${destination} 旅行 ${days} 天可能访问的主要景点名称。

**旅行信息：**
${originText ? `- 出发地：${origin}\n` : ''}- 目的地：${destination}
${destinationEndText ? `- 终点：${destinationEnd}\n` : ''}- 行程天数：${days} 天
- 同行人数：${people} 人
- 旅行偏好：${preferencesText}

**要求：**
1. 只列出景点名称，不需要详细描述
2. 列出 ${days} 天行程中可能访问的主要景点（每个景点一行）
3. 景点名称要准确、完整（例如："红场"、"莫斯科克里姆林宫"、"圣瓦西里大教堂"）
4. 不要包含餐厅、酒店、交通等非景点项目
5. 如果某个景点是免费景点，请在名称后标注"（免费）"

**输出格式：**
请以 JSON 数组格式输出景点名称列表，例如：
\`\`\`json
{
  "attractions": [
    "红场（免费）",
    "莫斯科克里姆林宫",
    "圣瓦西里大教堂",
    "冬宫博物馆"
  ]
}
\`\`\`

请开始列出景点。`;

    const response = await callLLM({
      prompt,
      maxTokens: 1000,
      temperature: 0.5,
    });

    // 解析 JSON
    let jsonStr = response.content.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || 
                     jsonStr.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const data = JSON.parse(jsonStr);
    const attractions: string[] = data.attractions || [];
    
    // 清理景点名称（移除"（免费）"标注，因为价格查询会单独处理）
    return attractions.map(attr => attr.replace(/（免费）|\(免费\)/g, '').trim());
  } catch (error: any) {
    console.error('获取景点列表失败:', error);
    // 如果获取失败，返回空数组，后续将使用经验估算
    return [];
  }
}

