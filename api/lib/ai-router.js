
const cooldowns = new Map();

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const retryable = (status) =>
  [408, 429, 500, 502, 503, 504].includes(status);

async function requestJSON(url, headers, body, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || `HTTP ${response.status}`
      );

      error.status = response.status;

      const retryAfter = Number(response.headers.get('retry-after'));
      error.retryAfterMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 120000)
          : 0;

      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('AI request timed out');
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function getProviders() {
  const providers = [];

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: 'Gemini',
      model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
        .replace(/^models\//, ''),

      async generate(prompt, temperature, maxTokens) {
        const data = await requestJSON(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
          {
            'x-goog-api-key': process.env.GEMINI_API_KEY
          },
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens
            }
          }
        );

        return data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || '')
          .join('')
          .trim();
      }
    });
  }

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: 'Groq',
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',

      async generate(prompt, temperature, maxTokens) {
        const data = await requestJSON(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`
          },
          {
            model: this.model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: Math.min(1, temperature),
            max_completion_tokens: maxTokens
          }
        );

        return data?.choices?.[0]?.message?.content?.trim();
      }
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: 'OpenRouter',
      model: 'openrouter/free',

      async generate(prompt, temperature, maxTokens) {
        const data = await requestJSON(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'X-Title': 'DreamContinuator'
          },
          {
            model: this.model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: Math.min(1, temperature),
            max_tokens: maxTokens
          }
        );

        return data?.choices?.[0]?.message?.content?.trim();
      }
    });
  }

  return providers;
}

export async function generateWithFallback({
  prompt,
  temperature = 0.9,
  maxTokens = 1400
}) {
  const providers = getProviders();

  if (!providers.length) {
    const error = new Error('No AI provider configured');
    error.status = 503;
    error.publicMessage =
      'Configure at least one AI API key on the server.';
    throw error;
  }

  const failures = [];

  for (const provider of providers) {
    const cooldownUntil = cooldowns.get(provider.name) || 0;

    if (Date.now() < cooldownUntil) {
      failures.push(`${provider.name}: cooling down`);
      continue;
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const continuation = await provider.generate(
          prompt,
          temperature,
          maxTokens
        );

        if (!continuation) {
          const error = new Error('Empty AI response');
          error.status = 502;
          throw error;
        }

        cooldowns.delete(provider.name);

        console.log(
          `Dream generated using ${provider.name}: ${provider.model}`
        );

        return {
          continuation,
          provider: provider.name,
          model: provider.model
        };
      } catch (error) {
        const status = Number(error.status) || 502;

        console.warn(
          `${provider.name} failed (${status}): ${error.message}`
        );

        failures.push(`${provider.name}: ${status}`);

        if (status === 429 || status === 503) {
          cooldowns.set(
            provider.name,
            Date.now() + (error.retryAfterMs || 30000)
          );
        }

        if (
          status === 429 ||
          status === 503 ||
          !retryable(status) ||
          attempt === 1
        ) {
          break;
        }

        await wait(400);
      }
    }
  }

  const error = new Error(failures.join('; '));
  error.status = 503;
  error.publicMessage =
    'All configured AI providers are currently unavailable. Please try again later.';

  throw error;
}
