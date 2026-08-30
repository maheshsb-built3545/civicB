import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { evaluateSpamHeuristics } from './src/utils/spamDetector';
import mongoose from 'mongoose';
import { connectDB } from './src/server/db';
import { authRouter } from './src/server/authRouter';
import { issueRouter } from './src/server/issueRouter';
import { cycleRouter } from './src/server/cycleRouter';
import { auditRouter } from './src/server/auditRouter';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Connect to MongoDB Atlas (logs success or warning)
  await connectDB();

  app.use(express.json());
  // Cookie parser — required for httpOnly JWT cookie reading
  app.use(cookieParser());

  // Health check endpoint with DB state verification
  app.get('/api/health', (_req, res) => {
    const readyState = mongoose.connection.readyState;
    const dbStates: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      dbState: readyState,
      dbStatus: dbStates[readyState] || 'unknown',
    });
  });

  // Authentication routes: POST /api/auth/login, POST /api/auth/logout
  app.use('/api/auth', authRouter);

  // Issue CRUD: POST /api/issues, GET /api/issues, GET /api/issues/ticket/:id,
  //             PATCH /api/issues/:id/toggle-action, POST /api/issues/:id/override
  app.use('/api/issues', issueRouter);

  // Cycle/Budget: GET /api/cycle/current, POST /api/cycle/auto-fit
  app.use('/api/cycle', cycleRouter);

  // Audit trail: GET /api/audit-logs (admin-only)
  app.use('/api/audit-logs', auditRouter);

  // AI-Powered Complaint Verification & Scam Detection Endpoint
  app.post('/api/verify-issue', async (req, res) => {
    try {
      const { title = '', description = '', category = '', ward = '', landmark = '' } = req.body || {};

      // 1. Fast, highly strict rule-based heuristic screening
      const heuristic = evaluateSpamHeuristics(title, description, category, landmark);

      // If heuristic caught blatant scam, phishing, malicious link, or mash with high confidence
      if (heuristic.isSpam && heuristic.confidenceLabel === 'high') {
        // [DIAG] TEMPORARY DIAGNOSTIC LOG — REMOVE AFTER VERIFICATION
        console.log(`[DIAG][verify-issue] DECISION_SOURCE=HEURISTIC_BLOCK | title="${title.substring(0, 50)}" | rule=${heuristic.ruleMatched} | reason="${heuristic.rejectionReason?.substring(0, 60)}"`);
        return res.json({
          isLikelyGenuine: false,
          isSpam: true,
          confidenceLabel: 'high',
          aiReasoning: heuristic.rejectionReason || 'Submission detected as non-civic spam or scam.',
          rejectionReason: heuristic.rejectionReason,
          suggestedCategory: undefined,
          _diagSource: 'HEURISTIC_BLOCK' // [DIAG] TEMPORARY — REMOVE AFTER VERIFICATION
        });
      }

      // 2. Deep Gemini Model Evaluation
      const ai = getGenAI();
      if (!ai) {
        // [DIAG] TEMPORARY DIAGNOSTIC LOG — REMOVE AFTER VERIFICATION
        console.log(`[DIAG][verify-issue] DECISION_SOURCE=HEURISTIC_NO_API_KEY | title="${title.substring(0, 50)}" | GEMINI_API_KEY=${process.env.GEMINI_API_KEY ? 'SET(first4=' + process.env.GEMINI_API_KEY.substring(0, 4) + ')' : 'MISSING'}`);
        // Fail-safe heuristic decision if no Gemini API Key configured
        return res.json({
          isLikelyGenuine: heuristic.isLikelyGenuine,
          isSpam: heuristic.isSpam,
          confidenceLabel: heuristic.confidenceLabel,
          aiReasoning: heuristic.isSpam
            ? 'Blocked by municipal filter.'
            : 'Pre-screened via municipal civic criteria.',
          rejectionReason: heuristic.rejectionReason,
          suggestedCategory: undefined,
          _diagSource: 'HEURISTIC_NO_API_KEY' // [DIAG] TEMPORARY — REMOVE AFTER VERIFICATION
        });
      }

      const prompt = `You are a municipal complaint triage and spam classifier for the Kopargaon Municipal Council (कोपरगाव नगर परिषद), Ahmednagar district, Maharashtra, India.
Your job is to determine if a citizen submission is a GENUINE civic issue or SPAM / SCAM / FAKE / JUNK.

Submission to evaluate:
- Title: "${title}"
- Description: "${description}"
- Selected Category: "${category}"
- Ward: "${ward}"
- Landmark: "${landmark}"

CLASSIFICATION RULES:
1. SPAM / SCAM (isSpam: true, isLikelyGenuine: false):
   - Any financial scams (lottery, work-from-home, prize money, instant loans, KYC fraud, OTP requests, crypto/bitcoin, trading).
   - Commercial advertising, promotion of shops/services, marketing, promotional links/URLs, telegram or whatsapp group invites.
   - Irrelevant non-civic chat, jokes, gibberish, personal conversations, insults with no civic problem.
   - Test placeholder submissions ("test 123", "hello checking", "sample").

2. GENUINE CIVIC COMPLAINT (isSpam: false, isLikelyGenuine: true):
   - Real municipal issues in Kopargaon: potholes, broken roads, contaminated/no water supply, leaking water pipe, clogged drain, overflowing gutter/sewage, dark streetlights, uncollected garbage, open manholes, stray dog menace, encroached public paths, etc.
   - Genuine complaints can be in English, Marathi (मराठी), Hindi, or transliterated Marathi/Hinglish (e.g. "khadda aahe", "light lagat nahi", "kachra gadi aali nahi").
   - Even short or poorly formatted genuine complaints should be classified as isSpam: false, isLikelyGenuine: true.

CONFIDENCE:
- "high": Clear spam/scam OR clearly identifiable civic issue.
- "medium": Plausible complaint with limited words.
- "low": Highly ambiguous.

Output STRICT JSON only:
{
  "isSpam": boolean,
  "isLikelyGenuine": boolean,
  "confidenceLabel": "high" | "medium" | "low",
  "aiReasoning": string,
  "rejectionReason": string | null,
  "suggestedCategory": string | null
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });

      const responseText = response.text || '';
      const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      const isSpam = Boolean(parsed.isSpam);
      const isLikelyGenuine = typeof parsed.isLikelyGenuine === 'boolean'
        ? parsed.isLikelyGenuine
        : !isSpam;

      const confidenceLabel: 'high' | 'medium' | 'low' =
        ['high', 'medium', 'low'].includes(parsed.confidenceLabel)
          ? parsed.confidenceLabel
          : 'medium';

      const rejectionReason = isSpam
        ? (parsed.rejectionReason || parsed.aiReasoning || 'Submission does not describe a valid civic or municipal issue.')
        : null;

      const aiReasoning = typeof parsed.aiReasoning === 'string' && parsed.aiReasoning.trim()
        ? parsed.aiReasoning.trim()
        : isSpam
          ? 'Submission flagged as non-civic content or spam.'
          : 'Submission identified as a valid municipal complaint.';

      // [DIAG] TEMPORARY DIAGNOSTIC LOG — REMOVE AFTER VERIFICATION
      console.log(`[DIAG][verify-issue] DECISION_SOURCE=GEMINI_AI | title="${title.substring(0, 50)}" | isSpam=${isSpam} | confidence=${confidenceLabel} | reasoning="${aiReasoning.substring(0, 80)}"`);

      return res.json({
        isLikelyGenuine,
        isSpam,
        confidenceLabel,
        aiReasoning,
        rejectionReason,
        suggestedCategory: parsed.suggestedCategory || undefined,
        _diagSource: 'GEMINI_AI' // [DIAG] TEMPORARY — REMOVE AFTER VERIFICATION
      });

    } catch (err: any) {
      console.error('[API verify-issue] Error processing verification:', err);
      // Fail safely using heuristics on error
      const { title = '', description = '', category = '', landmark = '' } = req.body || {};
      const fallback = evaluateSpamHeuristics(title, description, category, landmark);
      // [DIAG] TEMPORARY DIAGNOSTIC LOG — REMOVE AFTER VERIFICATION
      console.log(`[DIAG][verify-issue] DECISION_SOURCE=ERROR_FALLBACK | title="${title.substring(0, 50)}" | error="${String(err?.message || err).substring(0, 80)}"`);
      return res.json({
        isLikelyGenuine: fallback.isLikelyGenuine,
        isSpam: fallback.isSpam,
        confidenceLabel: fallback.confidenceLabel,
        aiReasoning: fallback.isSpam ? fallback.rejectionReason : 'Pre-screened via municipal civic criteria.',
        rejectionReason: fallback.rejectionReason,
        suggestedCategory: undefined,
        _diagSource: 'ERROR_FALLBACK' // [DIAG] TEMPORARY — REMOVE AFTER VERIFICATION
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kopargaon Civic Platform Server running on port ${PORT}`);
  });
}

startServer();
