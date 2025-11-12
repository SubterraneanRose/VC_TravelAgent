import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '../../../lib/llm/client';

/**
 * 解析语音输入的自然语言，提取结构化信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '缺少必需参数：text' },
        { status: 400 }
      );
    }

    // 构建提示词，让 LLM 从自然语言中提取结构化信息
    const prompt = `请从以下用户的语音输入中提取旅行需求信息：

用户输入："${text}"

请提取以下信息（如果用户没有提到，则返回 null）：
1. 出发地/起点（origin）：用户的出发城市
2. 目的地（destination）：旅行目的地
3. 终点（destinationEnd）：返程地点（如果与出发地不同）
4. 天数（days）：行程天数
5. 开始日期（startDate）：如果提到具体日期，格式为 YYYY-MM-DD，否则为 null
6. 结束日期（endDate）：如果提到具体日期，格式为 YYYY-MM-DD，否则为 null
7. 预算（budget）：预算金额（数字，单位：元）
8. 同行人数（people）：出行人数（数字）
9. 偏好（preferences）：旅行偏好列表（数组，如：["美食", "动漫", "亲子"]）

请以 JSON 格式回答，只返回 JSON 对象，不要包含其他文字：

{
  "origin": "出发地或null",
  "destination": "目的地或null",
  "destinationEnd": "终点或null",
  "days": 天数或null,
  "startDate": "YYYY-MM-DD或null",
  "endDate": "YYYY-MM-DD或null",
  "budget": 预算数字或null,
  "people": 人数或null,
  "preferences": ["偏好1", "偏好2"]或[]
}

如果无法提取任何信息，返回：
{
  "origin": null,
  "destination": null,
  "destinationEnd": null,
  "days": null,
  "startDate": null,
  "endDate": null,
  "budget": null,
  "people": null,
  "preferences": []
}`;

    // 调用 LLM
    const llmResponse = await callLLM({
      prompt,
      maxTokens: 500,
      temperature: 0.3, // 降低温度，让回答更准确
    });

    // 解析 JSON
    let jsonStr = llmResponse.content.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/) || 
                     jsonStr.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // 尝试直接查找 JSON 对象
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    const data = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('解析语音输入失败:', error);
    return NextResponse.json(
      { error: error.message || '解析语音输入失败' },
      { status: 500 }
    );
  }
}

