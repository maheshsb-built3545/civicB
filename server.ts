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

      const prompt = `You are a municipal complaint triage, spam classifier, and Misinformation Shield for the Kopargaon Municipal Council (कोपरगाव नगर परिषद), Ahmednagar district, Maharashtra, India.
Your job is to determine if a citizen submission is a GENUINE civic issue, SPAM/SCAM, or a MISINFORMATION / BAD-FAITH / DEFAMATORY ATTACK.

Submission to evaluate:
- Title: "${title}"
- Description: "${description}"
- Selected Category: "${category}"
- Ward: "${ward}"
- Landmark: "${landmark}"

MISINFORMATION & BAD-FAITH DETECTION RULES (isMisinformationRisk: true):
- Detect highly emotive attacks targeting named individuals, rival business owners, officers, or politicians.
- Detect fake coordinated panic, impossible fantasy scenarios (e.g., aliens/ufo damaging roads, fake chemical spills, fabricated biological threats), smearing rumors, or political character assassination.
- If isMisinformationRisk is true, set isLikelyGenuine: false, and provide a brief safetyRationale explaining the misinformation or defamatory nature.

CLASSIFICATION RULES:
1. SPAM / SCAM (isSpam: true, isLikelyGenuine: false):
   - Financial scams, commercial promotions, marketing links, OTP requests, crypto, or test mashing.

2. GENUINE CIVIC COMPLAINT (isSpam: false, isLikelyGenuine: true, isMisinformationRisk: false):
   - Real municipal issues in Kopargaon: potholes, broken roads, contaminated water, leaking pipe, clogged drain, dark streetlights, garbage, stray dogs, open manholes.

CONFIDENCE:
- "high": Clear spam/scam/misinformation OR clearly genuine civic issue.
- "medium": Plausible complaint with limited context.
- "low": Ambiguous.

Output STRICT JSON only:
{
  "isSpam": boolean,
  "isLikelyGenuine": boolean,
  "isMisinformationRisk": boolean,
  "confidenceLabel": "high" | "medium" | "low",
  "aiReasoning": string,
  "rejectionReason": string | null,
  "safetyRationale": string | null,
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
      const isMisinformationRisk = Boolean(parsed.isMisinformationRisk);
      const isLikelyGenuine = typeof parsed.isLikelyGenuine === 'boolean'
        ? parsed.isLikelyGenuine
        : (!isSpam && !isMisinformationRisk);

      const confidenceLabel: 'high' | 'medium' | 'low' =
        ['high', 'medium', 'low'].includes(parsed.confidenceLabel)
          ? parsed.confidenceLabel
          : 'medium';

      const rejectionReason = isSpam
        ? (parsed.rejectionReason || parsed.aiReasoning || 'Submission does not describe a valid civic or municipal issue.')
        : null;

      const safetyRationale = parsed.safetyRationale || (isMisinformationRisk ? 'Flagged as bad-faith intent, defamation, or misinformation risk.' : null);

      const aiReasoning = typeof parsed.aiReasoning === 'string' && parsed.aiReasoning.trim()
        ? parsed.aiReasoning.trim()
        : isMisinformationRisk
          ? 'Quarantined due to misinformation risk or defamatory content.'
          : isSpam
          ? 'Submission flagged as non-civic content or spam.'
          : 'Submission identified as a valid municipal complaint.';

      return res.json({
        isLikelyGenuine,
        isSpam,
        isMisinformationRisk,
        confidenceLabel,
        aiReasoning,
        rejectionReason,
        safetyRationale,
        suggestedCategory: parsed.suggestedCategory || undefined
      });

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
