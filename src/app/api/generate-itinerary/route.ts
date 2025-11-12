import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '../../../lib/llm/client';
import { buildItineraryPrompt } from '../../../lib/llm/prompts';
import type { TripGenerationParams } from '../../../lib/llm/prompts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params: TripGenerationParams = {
      destination: body.destination,
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

    // 构建提示词
    const prompt = buildItineraryPrompt(params);

    // 调用 LLM
    const llmResponse = await callLLM({
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    // 尝试解析 JSON（LLM 可能返回带 markdown 代码块的 JSON）
    let itineraryData;
    try {
      let jsonStr = llmResponse.content;
      
      // 尝试提取 JSON（可能被 ```json 包裹）
      const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || 
                       jsonStr.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      // 清理可能的空白字符
      jsonStr = jsonStr.trim();
      
      // 如果 JSON 被截断，尝试修复（查找最后一个完整的对象）
      if (!jsonStr.endsWith('}')) {
        // 尝试找到最后一个完整的 JSON 对象
        const lastCompleteBrace = jsonStr.lastIndexOf('}');
        if (lastCompleteBrace > 0) {
          // 检查是否是完整的数组
          const beforeBrace = jsonStr.substring(0, lastCompleteBrace + 1);
          const openBraces = (beforeBrace.match(/\{/g) || []).length;
          const closeBraces = (beforeBrace.match(/\}/g) || []).length;
          
          if (openBraces === closeBraces) {
            // 如果大括号匹配，尝试补全数组
            if (jsonStr.includes('"days"') && !jsonStr.includes(']')) {
              jsonStr = beforeBrace + ']}';
            } else {
              jsonStr = beforeBrace + '}';
            }
          }
        }
      }
      
      itineraryData = JSON.parse(jsonStr);
    } catch (parseError: any) {
      // 如果解析失败，尝试更宽松的解析
      console.error('LLM 返回内容解析失败:', parseError.message);
      console.error('原始内容长度:', llmResponse.content.length);
      console.error('原始内容前1000字符:', llmResponse.content.substring(0, 1000));
      
      // 尝试直接查找 JSON 对象
      try {
        const jsonObjectMatch = llmResponse.content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          itineraryData = JSON.parse(jsonObjectMatch[0]);
        } else {
          throw new Error('无法找到有效的 JSON 对象');
        }
      } catch (secondTryError) {
        return NextResponse.json(
          { 
            error: 'LLM 返回格式不正确，无法解析 JSON',
            parseError: parseError.message,
            rawContentLength: llmResponse.content.length,
            rawContentPreview: llmResponse.content.substring(0, 1000),
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: itineraryData,
      usage: llmResponse.usage,
    });
  } catch (error: any) {
    console.error('生成行程失败:', error);
    return NextResponse.json(
      { error: error.message || '生成行程失败' },
      { status: 500 }
    );
  }
}

