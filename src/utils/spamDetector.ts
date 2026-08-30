/**
 * Comprehensive Heuristic & Pattern-based Civic Complaint Spam & Scam Detector.
 * Provides instant and robust detection for malicious links, financial scams,
 * phishing, promotional ads, keyboard mash, and non-civic gibberish.
 */

export interface SpamDetectionResult {
  isSpam: boolean;
  isLikelyGenuine: boolean;
  confidenceLabel: 'high' | 'medium' | 'low';
  rejectionReason: string | null;
  ruleMatched?: string;
}

// Scam & Phishing keywords (English, Hindi, Marathi, Transliterated)
const SCAM_PATTERNS = [
  // Financial & Lottery Scams
  /\b(lottery|jackpot|prize|winner|won\s+\d+|claim\s+(your\s+)?(prize|reward|cash|money|bonus))\b/i,
  /\b(earn\s+(\$|₹|rs\.?|inr)?\s*\d+|make\s+money\s+(fast|online|from\s+home)|daily\s+income|part\s*time\s*job)\b/i,
  /\b(crypto|bitcoin|ethereum|forex|trading\s*bot|binary\s*options|usdt|token\s*airdrop)\b/i,
  /\b(free\s*recharge|recharge\s*offer|cashback\s*guaranteed|spin\s*to\s*win)\b/i,
  /\b(loan\s*approved|instant\s*loan|0%\s*interest\s*loan|paisa\s*kamaye|kamaye\s*mahina)\b/i,
  /\b(ghar\s*baithe\s*(paise|kamaye)|lottery\s*lagli|inaam\s*jinka)\b/i,
  /\b(लॉटरी|इनाम|बक्षीस|पैसे\s*कमवा|घरबसल्या\s*पैसे|कर्ज\s*मंजूर|फ्री\s*रिचार्ज)\b/i,

  // Phishing & Credentials
  /\b(send\s*otp|share\s*otp|enter\s*password|kyc\s*update|bank\s*details|account\s*blocked|verify\s*pan|aadhaar\s*link)\b/i,
  /\b(ओटीपी|पासवर्ड|खाते\s*ब्लॉक|केवायसी)\b/i,

  // Gambling & Adult Spam
  /\b(bet365|1xbet|rummy|casino|poker|teen\s*patti|satta|matka|kalyan\s*matka)\b/i,
  /\b(call\s*girls?|escort\s*service|dating\s*chat|sexy\s*video|adult\s*content|viagra|porn)\b/i,

  // Promotional Solicitations & Spam Outreach
  /\b(click\s*here|click\s*link|visit\s*our\s*website|subscribe\s*now|buy\s*now|discount\s*code|promo\s*code)\b/i,
  /\b(join\s*(our\s*)?(telegram|whatsapp|channel|group)|dm\s*for\s*details|contact\s*on\s*whatsapp)\b/i,
  /\b(t\.me\/|wa\.me\/|chat\.whatsapp\.com\/|bit\.ly\/|tinyurl\.com\/|goo\.gl\/)\b/i,
  /\b(https?:\/\/|www\.)[^\s]+/i, // Any raw URL in civic complaint is virtually always promotional or phishing
];

// Test / Mock strings that should not generate actual tickets
const TEST_PATTERNS = [
  /^(\s*test\s*)+$/i,
  /^(\s*testing\s*)+$/i,
  /^(\s*demo\s*)+$/i,
  /^(\s*sample\s*)+$/i,
  /^(\s*check(ing)?\s*)+$/i,
  /^(\s*asdf\w*)+$/i,
  /^(\s*hello\s*)+$/i,
  /^(\s*hi\s*)+$/i,
  /^(\s*hello\s+check(ing)?\s+sample\s+test\s+\d+\s*)+$/i, // Specific: "hello checking sample test 123"
  /^[a-z0-9\s]{1,20}$/i, // Short (≤20 chars) pure-alphanumeric — catches "abc 123", "test 5", not real sentences
];

// Commercial & Business Advertisement Patterns
const COMMERCIAL_PATTERNS = [
  // Restaurant/Food Business
  /\b(restaurant|cafe|coffee|pizza|burger|fast\s*food|food\s*court|diner|bakery|sweet\s*shop|mithai|dhaba)\b/i,
  /\b(now\s+open|grand\s+opening|opening\s+soon|best\s*(in|quality|price|food)|delicious|authentic)\b/i,
  /\b(special\s+offer|discount|offer|deal|promotion|promo|limited\s+time)\b/i,
  
  // General Business Promotion
  /\b(shop|store|business|company|service|open\s+now|come\s+visit|call\s+us|visit\s+us)\b/i,
  /\b(buy\s+(our|the)|order\s+now|book\s+now|reserve\s+now|home\s+delivery|delivery\s+available)\b/i,
  /\b(we\s+(offer|provide|serve)|our\s+(products?|services?))/i,
  
  // Contact/Outreach (business)
  /\b(contact\s+(us|me)|call\s+(\+?\d+|us)|whatsapp|telegram|follow\s+(us|on)|like\s+(us|our))\b/i,
  /\b(dm\s+(me|us)|message\s+(us|me)|reach\s+(us|out)|get\s+in\s+touch)\b/i,
  
  // Marathi commercial patterns
  /\b(दुकान|व्यवसाय|सेवा|ऑफर|सूट|उपहार|खरेदी करा|पोहोच)\b/i,
];

// Non-civic content patterns (generic gibberish, off-topic)
const NON_CIVIC_PATTERNS = [
  /\b(hello\s+(check|test|trying|here)|checking\s+(if|this)|sample\s+(check|test)|test\s+(message|submission))\b/i,
  /\b(asdf|qwerty|zxcv|blah|blah\s+blah|nonsense|gibberish|random|placeholder)\b/i,
  /\b(just\s+(checking|testing|trying)|trying\s+(to\s+(see|test)))\b/i,
];

// Legitimate Civic Keywords in Kopargaon Context (English, Marathi, Transliterated)
const CIVIC_KEYWORDS = [
  // Roads / Infrastructure
  'road', 'khadda', 'pothole', 'potholes', 'street', 'footpath', 'gutter', 'drain', 'drainage', 'sewage',
  'divider', 'tar', 'concrete', 'rasta', 'khalge', 'gadde', 'dhamori', 'kolhar', 'shirdi', 'yeola',
  'रस्ता', 'खड्डा', 'खड्डे', 'गटर', 'नाली', 'ड्रेनेज', 'सांडपाणी', 'पदपथ', 'पादचारी',

  // Water Supply
  'water', 'pani', 'leak', 'pipeline', 'pipe', 'tap', 'pressure', 'tanker', 'godavari', 'dharana', 'supply',
  'contamination', 'dirty water', 'paani', 'nall', 'nal', 'borewell',
  'पाणी', 'नळ', 'पाईप', 'गळती', 'जलवाहिनी', 'पाणीपुरवठा', 'दूषित', 'पिण्याचे पाणी',

  // Electricity & Lighting
  'light', 'streetlight', 'lamp', 'pole', 'dark', 'bulb', 'wire', 'transformer', 'spark', 'electric', 'bijli',
  'tube', 'timba', 'diwa', 'durgandh',
  'दिवा', 'पथदिवा', 'लाईट', 'खांब', 'अंधार', 'वीज', 'वायर', 'विद्युत',

  // Sanitation & Solid Waste
  'garbage', 'kachra', 'waste', 'trash', 'dump', 'dustbin', 'cleaning', 'cleanliness', 'swachhata', 'smell',
  'stink', 'ghantagadi', 'sweeper', 'safai', 'drain', 'mosquito', 'insecticide', 'dengue', 'malaria',
  'कचरा', 'घाण', 'दुर्गंधी', 'स्वच्छता', 'कचराकुंडी', 'घंटागाडी', 'सफाई', 'डास', 'धुरळणी',

  // Animals & Safety
  'dog', 'stray', 'bite', 'cattle', 'cow', 'bull', 'pig', 'monkey', 'manhole', 'accident', 'danger', 'encroachment',
  'kutra', 'kuttra', 'janavar', 'dhoka', 'atikraman', 'tree', 'branch',
  'कुत्रा', 'भटके कुत्रे', 'जनावरे', 'धोकादायक', 'झाड', 'फांदी', 'अतिक्रमण', 'उघडे मॅनहोल'
];

/**
 * Evaluates text using comprehensive heuristics.
 */
export function evaluateSpamHeuristics(
  title: string,
  description: string,
  category: string,
  landmark: string
): SpamDetectionResult {
  const combinedText = `${title} ${description} ${landmark}`.trim();
  const lowerText = combinedText.toLowerCase();

  // 1. Length Check
  if (title.trim().length < 3) {
    return {
      isSpam: true,
      isLikelyGenuine: false,
      confidenceLabel: 'high',
      rejectionReason: 'The complaint title is too short to describe a civic issue.',
      ruleMatched: 'MIN_LENGTH_FAIL'
    };
  }

  // 2. Exact Test Submission check
  for (const pattern of TEST_PATTERNS) {
    if (pattern.test(title.trim()) || (description.trim() && pattern.test(description.trim()))) {
      return {
        isSpam: true,
        isLikelyGenuine: false,
        confidenceLabel: 'high',
        rejectionReason: 'Test submissions or placeholder text cannot be registered as public complaints.',
        ruleMatched: 'TEST_PATTERN_MATCH'
      };
    }
  }

  // 3. Scam / Phishing / Malware / Fraud Keywords Check
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isSpam: true,
        isLikelyGenuine: false,
        confidenceLabel: 'high',
        rejectionReason: 'Flagged by municipal safety filter: contains prohibited promotional, financial solicitation, or scam content.',
        ruleMatched: 'SCAM_PATTERN_MATCH'
      };
    }
  }

  // 3.5 Commercial Advertisement Check
  for (const pattern of COMMERCIAL_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isSpam: true,
        isLikelyGenuine: false,
        confidenceLabel: 'high',
        rejectionReason: 'Commercial advertisements and business promotions are not valid civic complaints. Please report genuine infrastructure or service issues.',
        ruleMatched: 'COMMERCIAL_AD_MATCH'
      };
    }
  }

  // 3.7 Non-Civic Gibberish Check
  for (const pattern of NON_CIVIC_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isSpam: true,
        isLikelyGenuine: false,
        confidenceLabel: 'high',
        rejectionReason: 'This appears to be test or placeholder text, not a genuine civic complaint.',
        ruleMatched: 'NON_CIVIC_GIBBERISH'
      };
    }
  }

  // 4. Repeated Characters / Keyboard Mash Check
  // e.g. "aaaaaaaaaa", "asdfasdfasdf", "1111111111"
  const repeatedCharMatch = combinedText.match(/(.)\1{5,}/);
  if (repeatedCharMatch) {
    return {
      isSpam: true,
      isLikelyGenuine: false,
      confidenceLabel: 'high',
      rejectionReason: 'Invalid complaint: Text contains repetitive gibberish characters.',
      ruleMatched: 'REPEATED_CHARS'
    };
  }

  // Keyboard row mash check (e.g., asdfgh, qwertyuiop, zxcvbnm)
  const mashPatterns = [
    /asdfgh/i, /qwerty/i, /zxcvbn/i, /hjkl;'/, /123456789/
  ];
  for (const mp of mashPatterns) {
    if (mp.test(lowerText) && lowerText.length < 25) {
      return {
        isSpam: true,
        isLikelyGenuine: false,
        confidenceLabel: 'high',
        rejectionReason: 'Detected keyboard mashing or random non-words.',
        ruleMatched: 'KEYBOARD_MASH'
      };
    }
  }

  // 5. Check if it matches legitimate civic context
  const hasCivicKeyword = CIVIC_KEYWORDS.some((kw) => lowerText.includes(kw.toLowerCase()));
  
  if (hasCivicKeyword) {
    return {
      isSpam: false,
      isLikelyGenuine: true,
      confidenceLabel: 'high',
      rejectionReason: null,
      ruleMatched: 'CIVIC_KEYWORD_MATCH'
    };
  }

  // If no obvious scam but also no obvious civic keyword, keep neutral/medium confidence for AI evaluation
  return {
    isSpam: false,
    isLikelyGenuine: true,
    confidenceLabel: 'medium',
    rejectionReason: null,
    ruleMatched: 'HEURISTIC_NEUTRAL'
  };
}
