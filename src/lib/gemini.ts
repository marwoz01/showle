import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenRouter(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY!,
    });
  }
  return _client;
}
