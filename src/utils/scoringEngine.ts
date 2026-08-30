import { ScoreBreakdown, CivicIssue } from '../types';

export interface UrgencyCalculationResult {
  urgencyScore: number;
  scoreBreakdown: ScoreBreakdown;
  dominantFactor: 'safety' | 'density' | 'aging' | 'proximity';
}

/**
  * Centralized Pure Prioritization Scoring Engine.
  * Weighted formula: (0.35 * Safety) + (0.25 * Density) + (0.20 * Aging) + (0.20 * Proximity)
  */
export function calculateUrgencyScore(
  input: Partial<ScoreBreakdown>,
  daysOpen: number = 0
): UrgencyCalculationResult {
  const safetyRisk = input.safetyRisk ?? 50;
  const citizenReportsCount = input.citizenReportsCount ?? 1;
  const citizenDensityScore = input.citizenDensityScore ?? Math.min(100, citizenReportsCount * 4 + 20);
  
  // Aging score recalculates dynamically as daysOpen increases
  const agingScore = Math.min(100, daysOpen * 4 + 10);
  const criticalFacilityProximityScore = input.criticalFacilityProximityScore ?? 50;
  const facilityDetails = input.facilityDetails;

  // Exact weighted formula components
  const safetyContrib = 0.35 * safetyRisk;
  const densityContrib = 0.25 * citizenDensityScore;
  const agingContrib = 0.20 * agingScore;
  const proximityContrib = 0.20 * criticalFacilityProximityScore;

  const rawScore = safetyContrib + densityContrib + agingContrib + proximityContrib;
  const urgencyScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Identify dominant factor for plain-language justification synthesis
  const contribs = [
    { factor: 'proximity' as const, val: proximityContrib },
    { factor: 'safety' as const, val: safetyContrib },
    { factor: 'aging' as const, val: agingContrib },
    { factor: 'density' as const, val: densityContrib }
  ];
  contribs.sort((a, b) => b.val - a.val);
  const dominantFactor = contribs[0].factor;

  const scoreBreakdown: ScoreBreakdown = {
    safetyRisk,
    citizenReportsCount,
    citizenDensityScore,
    daysOpen,
    agingScore,
    criticalFacilityProximityScore,
    facilityDetails,
    tieBreakerApplied: input.tieBreakerApplied,
    tieBreakerReason: input.tieBreakerReason
  };

  return {
    urgencyScore,
    scoreBreakdown,
    dominantFactor
  };
}

/**
  * Synthesizes plain-language justifications tied directly to per-factor scoring breakdown.
  */
export function generateJustification(
  issue: Partial<CivicIssue>,
  breakdown: ScoreBreakdown,
  language: string = 'en'
): string {
  const rankPrefix = issue.currentRank ? `Ranked #${issue.currentRank}: ` : '';

  // Determine highest contributing factor
  const safetyContrib = 0.35 * breakdown.safetyRisk;
  const densityContrib = 0.25 * breakdown.citizenDensityScore;
  const agingContrib = 0.20 * breakdown.agingScore;
  const proximityContrib = 0.20 * breakdown.criticalFacilityProximityScore;

  const contribs = [
    { factor: 'proximity', val: proximityContrib },
    { factor: 'safety', val: safetyContrib },
    { factor: 'aging', val: agingContrib },
    { factor: 'density', val: densityContrib }
  ];
  contribs.sort((a, b) => b.val - a.val);
  const topFactor = contribs[0].factor;

  if (topFactor === 'proximity' && breakdown.criticalFacilityProximityScore >= 70) {
    return language === 'mr'
      ? `${rankPrefix}महत्त्वाच्या संस्था सान्निध्य धोका — ${breakdown.facilityDetails || 'सार्वजनिक क्षेत्र'}. सुरक्षा धोका ${breakdown.safetyRisk}/100.`
      : `${rankPrefix}Critical infrastructure proximity risk — located near ${breakdown.facilityDetails || 'sensitive public zone'}. Safety hazard rated ${breakdown.safetyRisk}/100.`;
  }

  if (topFactor === 'aging' && breakdown.daysOpen >= 7) {
    return language === 'mr'
      ? `${rankPrefix}प्रलंबित कालावधी (SLA Aging) जास्त — समस्या ${breakdown.daysOpen} दिवसांपासून प्रलंबित (${breakdown.citizenReportsCount} तक्रारी).`
      : `${rankPrefix}Extended SLA resolution delay — unresolved for ${breakdown.daysOpen} days (${breakdown.agingScore}/100 aging penalty) across ${breakdown.citizenReportsCount} citizen reports.`;
  }

  if (topFactor === 'density' && breakdown.citizenReportsCount >= 10) {
    return language === 'mr'
      ? `${rankPrefix}नागरिक तक्रारींची उच्च संख्या — ${breakdown.citizenReportsCount} तक्रारींसह तीव्र सार्वजनिक असंतोष.`
      : `${rankPrefix}High citizen report volume — ${breakdown.citizenReportsCount} verified complaints recorded in locality.`;
  }

  return language === 'mr'
    ? `${rankPrefix}नागरी सुरक्षा धोका — तातडी श्रेणी ${breakdown.safetyRisk}/100 (${breakdown.citizenReportsCount} नागरिक तक्रारी).`
    : `${rankPrefix}Immediate public safety hazard — safety risk rated ${breakdown.safetyRisk}/100 with ${breakdown.citizenReportsCount} citizen reports.`;
}

export interface ComparisonFactorDetail {
  factorKey: 'safety' | 'density' | 'aging' | 'proximity';
  nameEn: string;
  nameMr: string;
  weightPercent: number;
  winnerRaw: number;
  loserRaw: number;
  winnerWeighted: number;
  loserWeighted: number;
  weightedDelta: number;
  isTiedFactor: boolean;
}

export interface ComparisonSummaryResult {
  winner: CivicIssue;
  loser: CivicIssue;
  isTied: boolean;
  summarySentence: string;
  factorDeltas: ComparisonFactorDetail[];
}

/**
 * Pure function: compares two issues side-by-side and synthesizes a factor-specific
 * plain-language sentence identifying the primary driver of the rank/score difference.
 */
export function generateComparisonSummary(
  issueA: CivicIssue,
  issueB: CivicIssue,
  language: string = 'en'
): ComparisonSummaryResult {
  const isTied = issueA.urgencyScore === issueB.urgencyScore;

  // Higher urgencyScore wins (ranks higher)
  const winner = issueA.urgencyScore >= issueB.urgencyScore ? issueA : issueB;
  const loser = issueA.urgencyScore >= issueB.urgencyScore ? issueB : issueA;

  const factors: ComparisonFactorDetail[] = [
    {
      factorKey: 'safety',
      nameEn: 'Safety Risk',
      nameMr: 'सार्वजनिक सुरक्षा व अपघात धोका',
      weightPercent: 35,
      winnerRaw: winner.scoreBreakdown.safetyRisk,
      loserRaw: loser.scoreBreakdown.safetyRisk,
      winnerWeighted: 0.35 * winner.scoreBreakdown.safetyRisk,
      loserWeighted: 0.35 * loser.scoreBreakdown.safetyRisk,
      weightedDelta: 0.35 * (winner.scoreBreakdown.safetyRisk - loser.scoreBreakdown.safetyRisk),
      isTiedFactor: winner.scoreBreakdown.safetyRisk === loser.scoreBreakdown.safetyRisk,
    },
    {
      factorKey: 'density',
      nameEn: 'Citizen Density & Volume',
      nameMr: 'नागरिक तक्रारी संख्या व लोकसंख्या घनता',
      weightPercent: 25,
      winnerRaw: winner.scoreBreakdown.citizenDensityScore,
      loserRaw: loser.scoreBreakdown.citizenDensityScore,
      winnerWeighted: 0.25 * winner.scoreBreakdown.citizenDensityScore,
      loserWeighted: 0.25 * loser.scoreBreakdown.citizenDensityScore,
      weightedDelta: 0.25 * (winner.scoreBreakdown.citizenDensityScore - loser.scoreBreakdown.citizenDensityScore),
      isTiedFactor: winner.scoreBreakdown.citizenDensityScore === loser.scoreBreakdown.citizenDensityScore,
    },
    {
      factorKey: 'aging',
      nameEn: 'SLA Aging / Resolution Delay',
      nameMr: 'प्रलंबित कालावधी (SLA Aging)',
      weightPercent: 20,
      winnerRaw: winner.scoreBreakdown.agingScore,
      loserRaw: loser.scoreBreakdown.agingScore,
      winnerWeighted: 0.20 * winner.scoreBreakdown.agingScore,
      loserWeighted: 0.20 * loser.scoreBreakdown.agingScore,
      weightedDelta: 0.20 * (winner.scoreBreakdown.agingScore - loser.scoreBreakdown.agingScore),
      isTiedFactor: winner.scoreBreakdown.agingScore === loser.scoreBreakdown.agingScore,
    },
    {
      factorKey: 'proximity',
      nameEn: 'Critical Infrastructure Proximity',
      nameMr: 'महत्त्वाच्या सार्वजनिक संस्थांचे सान्निध्य',
      weightPercent: 20,
      winnerRaw: winner.scoreBreakdown.criticalFacilityProximityScore,
      loserRaw: loser.scoreBreakdown.criticalFacilityProximityScore,
      winnerWeighted: 0.20 * winner.scoreBreakdown.criticalFacilityProximityScore,
      loserWeighted: 0.20 * loser.scoreBreakdown.criticalFacilityProximityScore,
      weightedDelta: 0.20 * (winner.scoreBreakdown.criticalFacilityProximityScore - loser.scoreBreakdown.criticalFacilityProximityScore),
      isTiedFactor: winner.scoreBreakdown.criticalFacilityProximityScore === loser.scoreBreakdown.criticalFacilityProximityScore,
    },
  ];

  // Find the factor with the highest positive weighted contribution delta for the winner
  const sortedDeltas = [...factors].sort((a, b) => b.weightedDelta - a.weightedDelta);
  const primaryDriver = sortedDeltas[0];
  const secondaryOffset = sortedDeltas.find((f) => f.weightedDelta < -1);

  let summarySentence = '';

  if (isTied) {
    summarySentence = language === 'mr'
      ? `दोन्ही तक्रारी (${winner.ticketNumber} व ${loser.ticketNumber}) समान तातडी गुणांसह (${winner.urgencyScore}/100) समतुल्य प्राधान्यक्रमावर आहेत.`
      : `Both issues (${winner.ticketNumber} and ${loser.ticketNumber}) have tied composite urgency scores (${winner.urgencyScore}/100) and are closely matched in priority.`;
  } else {
    const factorName = language === 'mr' ? primaryDriver.nameMr : primaryDriver.nameEn;
    const offsetName = secondaryOffset
      ? (language === 'mr' ? secondaryOffset.nameMr : secondaryOffset.nameEn)
      : null;

    if (language === 'mr') {
      let text = `तक्रार ${winner.ticketNumber} (क्रमांक #${winner.currentRank}) तक्रार ${loser.ticketNumber} (क्रमांक #${loser.currentRank}) च्या वर आहे कारण मुख्यत्वे उच्च ${factorName} (${primaryDriver.winnerRaw} vs ${primaryDriver.loserRaw})`;
      if (offsetName && secondaryOffset) {
        text += `, जरी ${offsetName} कमी असले तरी (${secondaryOffset.winnerRaw} vs ${secondaryOffset.loserRaw}).`;
      } else {
        text += `.`;
      }
      summarySentence = text;
    } else {
      let text = `${winner.ticketNumber} (Rank #${winner.currentRank}) ranks above ${loser.ticketNumber} (Rank #${loser.currentRank}) primarily due to higher ${factorName} (${primaryDriver.winnerRaw} vs ${primaryDriver.loserRaw})`;
      if (offsetName && secondaryOffset) {
        text += `, despite lower ${offsetName} (${secondaryOffset.winnerRaw} vs ${secondaryOffset.loserRaw}).`;
      } else {
        text += `.`;
      }
      summarySentence = text;
    }
  }

  return {
    winner,
    loser,
    isTied,
    summarySentence,
    factorDeltas: factors,
  };
}
