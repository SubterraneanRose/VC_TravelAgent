'use server';

interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

const provider = process.env.LLM_PROVIDER || 'aliyun-bailian';
const apiKey = process.env.LLM_API_KEY || '';

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  if (!apiKey) {
    throw new Error('LLM_API_KEY 未配置，请在 .env.local 中设置');
  }

  if (provider === 'aliyun-bailian') {
    return await callAliyunBailian(req);
  }

  throw new Error(`不支持的 LLM 提供商: ${provider}`);
}

async function callAliyunBailian(req: LLMRequest): Promise<LLMResponse> {
  // 阿里云百炼 API（使用 DashScope）
  const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  const model = 'qwen-turbo'; // 可以根据需要切换模型

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-DashScope-SSE': 'disable',
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: req.prompt,
          },
        ],
      },
      parameters: {
        max_tokens: req.maxTokens || 2000,
        temperature: req.temperature || 0.7,
        result_format: 'message',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API 调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // 解析阿里云百炼的响应格式
  const content = data.output?.choices?.[0]?.message?.content || '';
  
  if (!content) {
    throw new Error('LLM 返回内容为空');
  }

  return {
    content,
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens || 0,
      completionTokens: data.usage.output_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
}

