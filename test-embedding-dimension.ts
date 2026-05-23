import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    console.error('No valid GEMINI_API_KEY in env');
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    console.log('Requesting embedding from gemini-embedding-2-preview...');
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: 'The lead cloud architect of DevGenie is Nguyen',
      config: {
        outputDimensionality: 768
      }
    });

    const values = result.embeddings?.[0]?.values;
    if (values) {
      console.log('Embedding dimension length:', values.length);
    } else {
      console.log('No embedding values in result', result);
    }
  } catch (err: any) {
    console.error('Embedding error:', err);
  }
}

run();
