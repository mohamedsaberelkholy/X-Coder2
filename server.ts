import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Server-side Gemini API step endpoint for LocalCoder-X
app.post('/api/agent/step', async (req, res) => {
  const { systemInstruction, contents } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({
      fallback: true,
      message: 'GEMINI_API_KEY not configured. Falling back to built-in autonomous simulation engine.',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    res.json({
      success: true,
      text: response.text,
    });
  } catch (error: any) {
    const isRateLimit =
      error?.status === 'RESOURCE_EXHAUSTED' ||
      error?.code === 429 ||
      String(error?.message || '').includes('429') ||
      String(error?.message || '').includes('quota') ||
      String(error?.message || '').includes('RESOURCE_EXHAUSTED');

    // Return status 200 with fallback indicator so client smoothly switches to built-in simulator
    res.status(200).json({
      success: false,
      fallback: true,
      isRateLimit,
      message: isRateLimit
        ? 'Gemini API free tier rate limit reached. Automatically continuing with LocalCoder-X autonomous simulator.'
        : (error?.message || 'Gemini API call failed'),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`LocalCoder-X Agent Workbench listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Server initialization failed:', err);
  process.exit(1);
});
