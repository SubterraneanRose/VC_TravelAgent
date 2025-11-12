export interface TripGenerationParams {
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  budget: number | null;
  preferences: string[];
  people?: number;
}

export function buildItineraryPrompt(params: TripGenerationParams): string {
  const { destination, startDate, endDate, days, budget, preferences, people = 2 } = params;
  
  const preferencesText = preferences.length > 0 
    ? preferences.join('、')
    : '无特殊偏好';

  const budgetText = budget ? `预算约 ¥${budget.toLocaleString()}` : '预算不限';

  return `你是一位专业的旅行规划师。请为以下旅行需求生成详细的行程计划。

**旅行信息：**
- 目的地：${destination}
- 出发日期：${startDate}
- 结束日期：${endDate}
- 行程天数：${days} 天
- 同行人数：${people} 人
- 旅行偏好：${preferencesText}
- ${budgetText}

**要求：**
1. 生成 ${days} 天的详细行程，每天包含：
   - 上午、下午、晚上的活动安排
   - 推荐的景点（包含名称、地址、预计游览时间）
   - 推荐的餐厅（包含名称、地址、菜系类型）
   - 住宿建议（如果涉及多城市）
   - 交通方式建议
   - 每个项目的预估费用

2. 行程要符合以下偏好：${preferencesText}
3. ${budget ? `总预算控制在 ¥${budget.toLocaleString()} 以内，合理分配各项费用` : '费用合理即可'}
4. 考虑 ${people} 人出行的实际情况

**输出格式要求（JSON）：**
请严格按照以下 JSON 格式输出，不要包含任何其他文字说明：

\`\`\`json
{
  "summary": "行程总体概述（100字以内）",
  "totalBudgetEstimate": 总预算估算（数字）,
  "days": [
    {
      "dayIndex": 1,
      "date": "日期（YYYY-MM-DD）",
      "theme": "当日主题",
      "summary": "当日概述",
      "items": [
        {
          "timeRange": "时间段（如：09:00-12:00）",
          "type": "类型（spot/food/hotel/transport）",
          "name": "名称",
          "address": "地址",
          "notes": "备注说明",
          "costEst": 预估费用（数字，可选）
        }
      ]
    }
  ]
}
\`\`\`

请开始生成行程计划。`;

}

