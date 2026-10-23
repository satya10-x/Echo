import Groq from 'groq-sdk';
import { AIError } from '../errors.js';
import { buildPrompts, outputTokenLimit, responseSchema } from '../prompts/rewritePrompts.js';

export function createGroqProvider(config) {
  // Construct lazily, only after the shared service checks credentials and model.
  let client;
  return {
    async generate(input, { signal, timeoutMs, repair, task }) {
      client ??= new Groq({ apiKey: config.apiKey, maxRetries: 0, timeout: timeoutMs });
      const prompts = task ? { ...task.prompts, system: task.prompts.system + (repair ? '\nThe previous response was malformed. Return one complete JSON object with every required field and valid exact evidence.' : '') } : buildPrompts(input, repair);
      const responseFormat = config.structuredOutput === 'json_schema'
        ? { type: 'json_schema', json_schema: { name: 'rewrite', strict: true, schema: task?.schema || responseSchema(input) } }
        : { type: 'json_object' };
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'system', content: prompts.system }, { role: 'user', content: prompts.user }],
        response_format: responseFormat,
        max_completion_tokens: (task?.maxTokens || outputTokenLimit(input.length)),
      }, { signal, timeout: timeoutMs, maxRetries: 0 });
      const choice = response.choices?.[0];
      if (choice?.finish_reason === 'length') throw new AIError('AI_INVALID_RESPONSE', 'The rewrite exceeded the output limit. Try a shorter draft or a more detailed output length.', 502);
      if (choice?.finish_reason !== 'stop') throw new AIError('AI_REFUSED', 'The provider could not produce a complete rewrite for this draft.', 422);
      return choice.message?.content;
    },
  };
}
