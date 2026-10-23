export class AIError extends Error {
  constructor(code, message, status = 502, transient = false) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.status = status;
    this.transient = transient;
  }
}
export function providerError(error, signal) {
  if (error instanceof AIError) return error;
  if (signal?.aborted || error?.name === 'AbortError' || /Timeout|Connection/i.test(error?.name || '')) {
    return new AIError('AI_TIMEOUT', 'The AI provider took too long or could not be reached. Please try again.', 504, true);
  }
  const status = Number(error?.status || error?.statusCode);
  if ([408, 409, 429].includes(status) || status >= 500 || error instanceof TypeError) {
    return new AIError('AI_UNAVAILABLE', 'The AI provider is busy or temporarily unavailable. Please try again shortly.', 503, true);
  }
  if ([401, 403].includes(status)) return new AIError('AI_CONFIGURATION', 'The AI provider could not authenticate. Check the server’s provider configuration.', 503);
  return new AIError('AI_PROVIDER_ERROR', 'The AI provider could not complete this request. Check the configured model or try a different draft.', 502);
}
