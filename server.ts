import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
// @ts-ignore - plain JavaScript server pipeline
import { loadPersistedReports, runSyncReportsPipeline } from './server/syncReports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const SYSTEM_INSTRUCTION = `You are the Toxicology Archive (@toxicologyavp) Web3 Research & Due-Diligence Assistant.
Your style is crisp, signal-over-noise, practical, and skeptic-first—matching the @toxicologyavp ethos:
1. Always ground answers with the 3-Step Web3 Filter when evaluating a token or protocol:
   - Step 01: Who gets paid when this grows? (Real protocol revenue vs token emissions & insider unlocks)
   - Step 02: What breaks first under 10x load? (Client diversity, sequencer centralization, bridges, oracle bounds)
   - Step 03: Would anyone use it without points? (Organic retention vs airdrop/wash farming)
2. For Solana 1.0 questions: clarify that retiring "Mainnet Beta" is a production milestone reflecting multi-client resilience (Agave + Firedancer), QUIC congestion handling, and local fee markets—and users NEVER need to swap SOL, bridge tokens, or migrate wallets.
3. Keep responses concise, structured with clear bullets, and factual. Never invent citations.`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const status =
    typeof (err as { status?: number })?.status === 'number'
      ? (err as { status: number }).status
      : typeof (err as { code?: number })?.code === 'number'
      ? (err as { code: number }).code
      : null;
  if (status === 429) return true;

  const msg = err instanceof Error ? err.message : String(err);
  return (
    /429/i.test(msg) ||
    /resource_exhausted/i.test(msg) ||
    /rate\s*limit/i.test(msg) ||
    /quota/i.test(msg)
  );
}

class RateLimitError extends Error {
  status = 429;
  constructor(message = 'Rate limit reached, try again in a minute') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Executes a Gemini API call with exponential backoff on 429 RESOURCE_EXHAUSTED errors:
 * - Attempt 1 fails with 429 -> wait 2s -> retry
 * - Attempt 2 fails with 429 -> wait 4s -> retry
 * - Attempt 3 fails with 429 -> throw user-friendly "Rate limit reached, try again in a minute"
 * Also gracefully handles 404 on newer model tags with a free-tier fallback.
 */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0]
) {
  const retryDelays = [2000, 4000]; // retry after 2s, 4s
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: unknown) {
      lastErr = err;
      if (isRateLimitError(err)) {
        if (attempt < retryDelays.length) {
          const waitMs = retryDelays[attempt];
          console.warn(
            `[Gemini API] 429 Rate limit detected. Retrying after ${waitMs / 1000}s (attempt ${attempt + 1})...`
          );
          await delay(waitMs);
          continue;
        }
        throw new RateLimitError('Rate limit reached, try again in a minute');
      }

      // If 404 (model not found) on gemini-2.5-flash or gemini-2.5-flash-lite, fallback gracefully to gemini-4-hydrogen
      const msg = err instanceof Error ? err.message : String(err);
      if (
        /404|not_found/i.test(msg) &&
        (params.model === 'gemini-2.5-flash' || params.model === 'gemini-2.5-flash-lite')
      ) {
        console.warn(
          `[Gemini API] Model ${params.model} returned 404, falling back to gemini-4-hydrogen`
        );
        return await ai.models.generateContent({
          ...params,
          model: 'gemini-4-hydrogen',
        });
      }

      throw err;
    }
  }

  throw lastErr;
}

function createAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Check Settings > Secrets to attach an API key.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface GroundingSource {
  title: string;
  uri: string;
}

function extractSources(
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>
): GroundingSource[] {
  if (!Array.isArray(groundingChunks)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of groundingChunks) {
    const uri = chunk?.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk.web?.title || uri,
      uri,
    });
  }
  return sources;
}

interface IncomingHistoryItem {
  role: 'user' | 'model';
  text: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'toxicology-archive' });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { history, message, context } = req.body as {
        history?: IncomingHistoryItem[];
        message?: string;
        context?: { sceneTitle?: string; activePage?: string };
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Please enter a message to ask.' });
        return;
      }

      const ai = createAiClient();

      const sanitizedHistory = Array.isArray(history)
        ? history
            .filter(
              (item) =>
                item &&
                (item.role === 'user' || item.role === 'model') &&
                typeof item.text === 'string' &&
                item.text.trim().length > 0
            )
            .slice(-14)
            .map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            }))
        : [];

      const contextPrefix = context?.sceneTitle
        ? `[User is currently viewing: ${context.sceneTitle}${
            context.activePage ? ` on ${context.activePage}` : ''
          }]\n\n`
        : '';

      const contents = [
        ...sanitizedHistory,
        {
          role: 'user' as const,
          parts: [{ text: `${contextPrefix}${message.trim()}` }],
        },
      ];

      // Strictly uses free-tier-eligible gemini-2.5-flash with exponential backoff (2s, 4s) on 429
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text ?? '';
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = extractSources(chunks);

      res.json({
        text: text || 'No response text was returned by the model.',
        sources,
      });
    } catch (err: unknown) {
      const isRateLimit = isRateLimitError(err);
      const message = isRateLimit
        ? 'Rate limit reached, try again in a minute'
        : err instanceof Error
        ? err.message
        : 'Unexpected Gemini API error.';
      const status = isRateLimit
        ? 429
        : typeof (err as { status?: number })?.status === 'number'
        ? (err as { status: number }).status
        : 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  app.post('/api/research-grounding', async (req: Request, res: Response) => {
    try {
      const { target, question } = req.body as {
        target?: string;
        question?: string;
      };

      const subject = (target || '').trim();
      const promptText =
        (question || '').trim() ||
        `Run a factual Web3 due-diligence check on "${subject}" using live web sources. Summarize:
1. Who gets paid / fee model & token unlock structure
2. Stress failure modes / client or bridge architecture
3. Organic usage beyond points/airdrops.
Keep it crisp and factual in 4-6 bullet points.`;

      if (!subject && !question) {
        res
          .status(400)
          .json({ error: 'Provide a project name, ticker, or query.' });
        return;
      }

      const ai = createAiClient();
      // Strictly uses free-tier-eligible gemini-2.5-flash-lite (or gemini-2.5-flash) with exponential backoff (2s, 4s) on 429
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-2.5-flash-lite',
        contents: promptText,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = extractSources(chunks);

      res.json({
        summary: response.text ?? '',
        sources,
      });
    } catch (err: unknown) {
      const isRateLimit = isRateLimitError(err);
      const message = isRateLimit
        ? 'Rate limit reached, try again in a minute'
        : err instanceof Error
        ? err.message
        : 'Failed to run Google Search grounding check.';
      const status = isRateLimit
        ? 429
        : typeof (err as { status?: number })?.status === 'number'
        ? (err as { status: number }).status
        : 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  // GET /api/sync-reports: Retrieves current cached/persisted reports
  app.get('/api/sync-reports', (_req: Request, res: Response) => {
    try {
      const data = loadPersistedReports();
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to read persisted reports'
      });
    }
  });

  // POST /api/sync-reports: Executes the automated Web3 incident ingestion & Gemini diagnosis pipeline
  app.post('/api/sync-reports', async (_req: Request, res: Response) => {
    try {
      const result = await runSyncReportsPipeline();
      res.json(result);
    } catch (err: unknown) {
      console.error('[API /api/sync-reports] Error:', err);
      const isRateLimit = isRateLimitError(err);
      res.status(isRateLimit ? 429 : 500).json({
        error: isRateLimit
          ? 'Rate limit reached, try again in a minute'
          : err instanceof Error
          ? err.message
          : 'Failed to synchronize live threat reports'
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Toxicology Archive server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
