import { aiConfig } from '../../config/env.js';
import { validateRewrite } from '../../validation/rewrite.js';
import { AIError, providerError } from './errors.js';
import { parseRewrite } from './response.js';
import { createGroqProvider } from './providers/groqProvider.js';
import { createGeminiProvider } from './providers/geminiProvider.js';

export function createAIService(config = aiConfig, factories = { groq: createGroqProvider, gemini: createGeminiProvider }) {
  const clients = {};
  const configured = (name) => Boolean(config.providers[name]?.apiKey && config.providers[name]?.model);
  return {
    async rewrite(rawInput, { signal: requestSignal } = {}) {
      const input = validateRewrite(rawInput);
      if (!factories[config.primary] || !configured(config.primary)) {
        throw new AIError('AI_NOT_CONFIGURED', 'AI rewriting is not configured. Set the primary provider’s API key and model in server/.env, then restart the server.', 503);
      }
      const secondary = config.primary === 'groq' ? 'gemini' : 'groq';
      const providers = [config.primary];
      if (config.fallbackEnabled && configured(secondary)) providers.push(secondary);
      let repairUsed = false;
      for (const [index, provider] of providers.entries()) {
        requestSignal?.throwIfAborted();
        const controller = new AbortController();
        const signal = requestSignal ? AbortSignal.any([requestSignal, controller.signal]) : controller.signal;
        const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
        let stopWaiting;
        // Race as well as signal: a misbehaving transport cannot hold the HTTP response indefinitely.
        const aborted = new Promise((_, reject) => {
          stopWaiting = () => reject(new AIError('AI_TIMEOUT', 'The AI provider took too long. Please try again.', 504, true));
          signal.addEventListener('abort', stopWaiting, { once: true });
          if (signal.aborted) stopWaiting();
        });
        try {
          clients[provider] ??= factories[provider](config.providers[provider]);
          const attempt = async (repair) => {
            const text = await clients[provider].generate(input, { signal, timeoutMs: config.timeoutMs, repair });
            return parseRewrite(text, input);
          };
          let result;
          try {
            result = await Promise.race([attempt(false), aborted]);
          } catch (error) {
            if (error.code !== 'AI_INVALID_RESPONSE' || repairUsed || signal.aborted) throw error;
            repairUsed = true;
            result = await Promise.race([attempt(true), aborted]);
          }
          return { ...result, metadata: { provider, model: config.providers[provider].model, fallbackUsed: index > 0 } };
        } catch (error) {
          if (requestSignal?.aborted) throw new AIError('REQUEST_CANCELLED', 'The rewrite request was cancelled.', 499);
          const safe = providerError(error, signal);
          if (!safe.transient || index === providers.length - 1) throw safe;
        } finally {
          clearTimeout(timeout);
          signal.removeEventListener('abort', stopWaiting);
        }
      }
    },
  };
}
export const aiService = createAIService();
