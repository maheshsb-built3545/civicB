import { evaluateSpamHeuristics } from '../utils/spamDetector';

export interface IssueVerificationInput {
  title: string;
  description: string;
  category: string;
  ward: string;
  landmark: string;
}

export interface IssueVerificationResult {
  isLikelyGenuine: boolean;
  isSpam: boolean;
  confidenceLabel: 'high' | 'medium' | 'low';
  aiReasoning: string;
  rejectionReason?: string | null;
  suggestedCategory?: string;
}

/**
 * AI-powered spam and validity screening service for citizen complaint submissions.
 * Calls backend API /api/verify-issue, with local heuristic fallback.
 */
export async function verifyIssueSubmission(
  input: IssueVerificationInput
): Promise<IssueVerificationResult> {
  // 1. First run instant local heuristic check
  const localHeuristic = evaluateSpamHeuristics(
    input.title,
    input.description,
    input.category,
    input.landmark
  );

  // If local heuristic caught clear scam, phishing, or keyboard mash with high confidence, block immediately
  if (localHeuristic.isSpam && localHeuristic.confidenceLabel === 'high') {
    return {
      isLikelyGenuine: false,
      isSpam: true,
      confidenceLabel: 'high',
      aiReasoning: localHeuristic.rejectionReason || 'Submission detected as spam or scam.',
      rejectionReason: localHeuristic.rejectionReason,
      suggestedCategory: undefined
    };
  }

  // 2. Call backend server endpoint /api/verify-issue
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch('/api/verify-issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isLikelyGenuine: Boolean(data.isLikelyGenuine),
        isSpam: Boolean(data.isSpam),
        confidenceLabel: ['high', 'medium', 'low'].includes(data.confidenceLabel)
          ? data.confidenceLabel
          : 'medium',
        aiReasoning: data.aiReasoning || (data.isSpam ? 'Flagged as non-civic content or spam.' : 'Civic complaint verified.'),
        rejectionReason: data.rejectionReason || (data.isSpam ? data.aiReasoning : null),
        suggestedCategory: data.suggestedCategory || undefined
      };
    }
  } catch (err) {
    console.warn('[AI Issue Verification] Backend API call error or timeout, relying on heuristic verification:', err);
  }

  // 3. Fallback: Return heuristic assessment
  return {
    isLikelyGenuine: localHeuristic.isLikelyGenuine,
    isSpam: localHeuristic.isSpam,
    confidenceLabel: localHeuristic.confidenceLabel,
    aiReasoning: localHeuristic.isSpam
      ? (localHeuristic.rejectionReason || 'Detected non-civic or spam submission.')
      : 'Automated municipal triage pre-screening complete.',
    rejectionReason: localHeuristic.rejectionReason,
    suggestedCategory: undefined
  };
}
