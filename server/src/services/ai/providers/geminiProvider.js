import { GoogleGenAI } from '@google/genai';
import { AIError } from '../errors.js';
import { buildPrompts, outputTokenLimit, responseSchema } from '../prompts/rewritePrompts.js';

export function createGeminiProvider(config) {
  let client;
  return {
    async generate(input, { signal, timeoutMs, repair }) {
      client ??= new GoogleGenAI({ apiKey: config.apiKey, httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } } });
      const prompts = buildPrompts(input, repair);
      const response = await client.models.generateContent({
        model: config.model, contents: prompts.user,
        config: {
          systemInstruction: prompts.system,
          responseMimeType: 'application/json', responseJsonSchema: responseSchema(input),
          maxOutputTokens: outputTokenLimit(input.length), abortSignal: signal,
          httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
        },
      });
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'MAX_TOKENS') throw new AIError('AI_INVALID_RESPONSE', 'The rewrite exceeded the output limit. Try a shorter draft or a more detailed output length.', 502);
      if (candidate?.finishReason !== 'STOP') throw new AIError('AI_REFUSED', 'The provider could not produce a complete rewrite for this draft.', 422);
      return response.text;
    },
  };
}
