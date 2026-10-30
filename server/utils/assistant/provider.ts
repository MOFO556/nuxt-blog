import { createOpenAI } from '@ai-sdk/openai';
import { embed as aiEmbed, embedMany as aiEmbedMany, type EmbeddingModel, type LanguageModel } from 'ai';
import { resilientFetch } from '#server-utils/assistant/httpFetch';

export function createAssistantChatModel(): LanguageModel {
  const config = useRuntimeConfig();
  const baseURL = String(config.aiBaseUrl || '').replace(/\/$/, '');
  const apiKey = String(config.aiApiKey || 'local');
  const modelId = String(config.aiModel || 'llama-3.1-8b-instant');

  if (!baseURL)
    throw createError({
      statusCode: 503,
      statusMessage: 'AI provider not configured (AI_BASE_URL)',
    });

  const provider = createOpenAI({
    baseURL,
    apiKey,
    name: 'assistant-chat',
    fetch: resilientFetch,
  });

  return provider.chat(modelId);
}

export function createAssistantEmbeddingModel(): EmbeddingModel {
  const config = useRuntimeConfig();
  const baseURL = String(config.embeddingBaseUrl || config.aiBaseUrl || '').replace(/\/$/, '');
  const apiKey = String(config.embeddingApiKey || config.aiApiKey || 'local');
  const modelId = String(config.embeddingModel || 'nomic-embed-text');

  if (!baseURL)
    throw createError({
      statusCode: 503,
      statusMessage: 'Embedding provider not configured (EMBEDDING_BASE_URL)',
    });

  const provider = createOpenAI({
    baseURL,
    apiKey,
    name: 'assistant-embed',
    fetch: resilientFetch,
  });

  return provider.embedding(modelId);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length)
    return [];
  const model = createAssistantEmbeddingModel();
  const embeddings = texts.length === 1
    ? [(await aiEmbed({ model, value: texts[0]! })).embedding]
    : (await aiEmbedMany({ model, values: texts })).embeddings;

  const expected = Number(useRuntimeConfig().embeddingDimensions) || 0;
  const actual = embeddings[0]?.length ?? 0;
  if (expected > 0 && actual > 0 && actual !== expected)
    console.warn(`[assistant] embedding size ${actual} ≠ EMBEDDING_DIMENSIONS=${expected}. 
    Update EMBEDDING_DIMENSIONS (or EMBEDDING_BASE_URL/MODEL) and reindex posts.`);

  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding ?? [];
}