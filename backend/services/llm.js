const axios = require('axios');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL        = 'openai/gpt-4o-mini';
const VISION_MODEL = 'openai/gpt-4o';  // vision-capable model

/**
 * Send a standard text chat completion request to OpenRouter.
 */
async function chat(systemPrompt, userMessage) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization:  `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mirage-research.app',
        'X-Title':      'Mirage Research Platform',
      },
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Send a vision chat request (image + optional text context) to OpenRouter.
 * imageBase64 should be a data URL: "data:image/png;base64,..."
 */
async function chatWithImage(textMessage, imageBase64, documentContext) {
  const contentParts = [
    {
      type:      'image_url',
      image_url: { url: imageBase64 },
    },
    {
      type: 'text',
      text: documentContext
        ? `Context from document: "${documentContext}"\n\n${textMessage}`
        : textMessage,
    },
  ];

  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: VISION_MODEL,
      messages: [
        { role: 'user', content: contentParts },
      ],
      max_tokens:  1000,
      temperature: 0.2,
    },
    {
      headers: {
        Authorization:  `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mirage-research.app',
        'X-Title':      'Mirage Research Platform',
      },
    }
  );

  return response.data.choices[0].message.content;
}

module.exports = { chat, chatWithImage };
