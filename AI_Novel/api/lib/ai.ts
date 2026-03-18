import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let apiKey = process.env.DEEPSEEK_API_KEY;
let baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
let modelName = process.env.MODEL_NAME || 'deepseek-chat';

export const TIER_CONFIG = {
  free: {
    model: 'deepseek-chat', // 基础模型
    contextLimit: 4000,
    dailyLimit: 10
  },
  pro: {
    model: 'deepseek-chat', // 高级模型 (模拟)
    contextLimit: 32000,
    dailyLimit: 100
  },
  ultra: {
    model: 'deepseek-reasoner', // 顶级模型 (模拟)
    contextLimit: 128000,
    dailyLimit: 1000
  }
};

export function createAIClient(config?: { apiKey?: string; baseURL?: string; modelName?: string; tier?: 'free' | 'pro' | 'ultra' }) {
  const finalApiKey = config?.apiKey || apiKey || 'dummy-key';
  const finalBaseURL = config?.baseURL || baseURL;
  
  // Dynamic model selection based on tier
  let finalModel = config?.modelName || modelName;
  if (config?.tier && TIER_CONFIG[config.tier]) {
      finalModel = TIER_CONFIG[config.tier].model;
  }

  const client = new OpenAI({
    apiKey: finalApiKey,
    baseURL: finalBaseURL,
  });

  return { client, model: finalModel };
}

export let aiClient = new OpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL: baseURL,
});

export let MODEL_NAME = modelName;
export const getApiKey = () => apiKey;
export const getBaseURL = () => baseURL;

export async function checkAIConnection() {
  if (!apiKey || apiKey === 'dummy-key') return { success: false, message: 'API Key not configured' };
  try {
    const response = await aiClient.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Ping' }],
      max_tokens: 5,
    });
    return { success: true, message: 'Connected', model: response.model };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
