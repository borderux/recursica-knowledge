// What a cloud model key looks like, for the key check and for clearing old keys out of an agent's
// Hermes home. A gateway key (ccg_, cct_) and LiteLLM's old master key (sk- and 32 hex digits)
// match none of these shapes.
export const KEY_SHAPES = [
  ["Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/g],
  ["OpenAI", /sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{20,}/g],
  ["xAI", /xai-[A-Za-z0-9]{20,}/g],
  ["OpenRouter", /sk-or-v1-[A-Za-z0-9]{32,}/g],
  ["Groq", /gsk_[A-Za-z0-9]{20,}/g],
  ["Google", /AIza[0-9A-Za-z_-]{35}/g],
];

// Environment names a provider's key goes by, in an .env file.
export const KEY_NAMES = /^(ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|OPENAI_API_KEY|XAI_API_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY|MISTRAL_API_KEY|GROQ_API_KEY|DEEPSEEK_API_KEY|AZURE_API_KEY|AWS_SECRET_ACCESS_KEY|MODEL_KEY_[A-Z0-9_]+)$/;

// The kind of the first cloud key in a text, or null.
export function keyShape(text) {
  for (const [kind, re] of KEY_SHAPES) { re.lastIndex = 0; if (re.test(text)) return kind; }
  return null;
}
