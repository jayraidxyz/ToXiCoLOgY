// Plain JavaScript implementation of the automated Live Toxicology Report Archive pipeline
// Follows strict free-tier rules: gemini-2.5-flash only, zero paid search grounding,
// sequential 4-second delays, and exponential backoff retry on HTTP 429.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to persistent JSON archive file
const REPORTS_FILE_PATH = path.resolve(__dirname, '../public/data/live-toxicology-reports.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SEEDED_REPORTS = [
  {
    id: "permit2-offchain-signature-drainer",
    date: "2026-11-20",
    title: "Permit2 Batch Approval Phishing via Counterfeit DEX Aggregator",
    threatCategory: "Phishing & Wallet Drainer",
    severity: "CRITICAL",
    symptom: "User connected to a sponsored DEX clone and signed an ERC-20 Permit2 off-chain signature expecting a token swap. All ERC-20 tokens were drained within two blocks with zero on-chain gas paid by the victim.",
    diagnosis: "Permit2 signatures grant spender allowances off-chain without broadcasting an immediate approval transaction. The malicious front-end embedded a multi-token PermitBatch transfer call inside an innocent-looking permit request, allowing the attacker contract to pull tokens at will.",
    antidote: [
      "Never sign unverified typed data (EIP-712 / Permit2) prompts from unbookmarked domains.",
      "Use hardware wallet visual confirmation screens to verify the exact spender address and nonce.",
      "Periodically review and revoke active allowances via revoke.cash or block explorer approval checkers."
    ],
    sourceUrl: "https://rekt.news"
  },
  {
    id: "address-poisoning-zero-value-transfer",
    date: "2026-11-18",
    title: "Vanity Address Poisoning via Automated Zero-Value Dust Spams",
    threatCategory: "Address Poisoning",
    severity: "HIGH",
    symptom: "Victim meant to send 12,000 USDT to their exchange deposit address. They copied the last address from their wallet transaction history, which turned out to be an attacker vanity address with matching first 4 and last 4 characters.",
    diagnosis: "The attacker generated millions of vanity addresses matching frequent transactors and triggered zero-value transfers to inject the lookalike address into the victim's wallet activity log. The user relied on visual muscle memory instead of full-string verification.",
    antidote: [
      "Never copy recipient addresses from recent transaction history lists.",
      "Save whitelisted destination addresses directly into your wallet's address book.",
      "Verify the middle 8-12 hex characters of any recipient address before confirming."
    ],
    sourceUrl: "https://cointelegraph.com/news/address-poisoning-phishing-explainer"
  },
  {
    id: "unverified-proxy-upgrade-timelock-bypass",
    date: "2026-11-15",
    title: "Flash-Loan Liquidity Siphon via Compromised Proxy Implementation",
    threatCategory: "Smart Contract Exploit",
    severity: "CRITICAL",
    symptom: "Lending vault assets were suddenly drained following an unexpected contract upgrade executed during off-market hours.",
    diagnosis: "The protocol used a transparent upgradeable proxy where the admin key was held by a 2-of-4 multisig with no governance timelock. Private keys of two signers were phished via malicious PDF salary proposals, enabling an immediate implementation rewrite that zeroed collateral ratios.",
    antidote: [
      "Verify that all upgradeable protocol contracts enforce a mandatory 48-72h timelock.",
      "Check that admin keys are distributed to independent institutional signers with hardware multisigs.",
      "Apply the 3-Step Web3 Filter (Step 02: What breaks first under stress) before depositing yield capital."
    ],
    sourceUrl: "https://decrypt.co"
  }
];

/**
 * Ensures the persistent JSON data store exists on disk and returns its contents
 */
export function loadPersistedReports() {
  try {
    const dir = path.dirname(REPORTS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_FILE_PATH)) {
      const initialPayload = {
        lastSyncTimestamp: new Date().toISOString(),
        reports: SEEDED_REPORTS
      };
      fs.writeFileSync(REPORTS_FILE_PATH, JSON.stringify(initialPayload, null, 2), 'utf-8');
      return initialPayload;
    }
    const raw = fs.readFileSync(REPORTS_FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.reports)) {
      data.reports = SEEDED_REPORTS;
    }
    return data;
  } catch (err) {
    console.error('Error reading persisted reports file:', err);
    return {
      lastSyncTimestamp: new Date().toISOString(),
      reports: SEEDED_REPORTS
    };
  }
}

/**
 * Saves reports payload to disk
 */
export function savePersistedReports(payload) {
  try {
    const dir = path.dirname(REPORTS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REPORTS_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persisted reports file:', err);
  }
}

/**
 * Minimal XML item extractor for public RSS feeds without external npm dependencies
 */
function parseRssItems(xmlText) {
  const items = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || xmlText.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const block of itemMatches) {
    const titleMatch = block.match(/<title(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) ||
                      block.match(/href=["']([^"']+)["']/i);
    const descMatch = block.match(/<description(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                      block.match(/<summary(?:[^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
    const dateMatch = block.match(/<pubDate(?:[^>]*)>([\s\S]*?)<\/pubDate>/i) ||
                      block.match(/<published(?:[^>]*)>([\s\S]*?)<\/published>/i);

    const title = (titleMatch ? titleMatch[1] : '').replace(/<[^>]+>/g, '').trim();
    const link = (linkMatch ? linkMatch[1] : '').trim();
    const desc = (descMatch ? descMatch[1] : '').replace(/<[^>]+>/g, '').trim();
    const pubDate = (dateMatch ? dateMatch[1] : new Date().toISOString()).trim();

    if (title && title.length > 5) {
      items.push({
        title,
        link: link || 'https://rekt.news',
        snippet: desc.slice(0, 500),
        pubDate
      });
    }
  }

  return items;
}

/**
 * Fetches raw candidates from free public endpoints
 */
async function fetchPublicIncidentCandidates() {
  const candidates = [];

  // 1. Reddit r/CryptoCurrency public JSON search (zero auth, free endpoint)
  try {
    const res = await fetch(
      'https://www.reddit.com/r/CryptoCurrency/search.json?q=scam+OR+drainer+OR+exploit+OR+phishing+OR+hack&restrict_sr=1&sort=new&limit=10',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ToxicologyArchive/1.0',
          'Accept': 'application/json'
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      const children = data?.data?.children || [];
      for (const child of children) {
        const d = child?.data;
        if (!d || d.is_self === false && !d.title) continue;
        const text = `${d.title} ${(d.selftext || '').slice(0, 400)}`;
        if (/drain|hack|scam|exploit|phish|stolen|loss|compromis|rug|drainer|wallet/i.test(text)) {
          candidates.push({
            title: d.title,
            link: d.url && d.url.startsWith('http') ? d.url : `https://reddit.com${d.permalink}`,
            snippet: (d.selftext || d.title).slice(0, 500),
            source: 'Reddit Security Incident'
          });
        }
      }
    }
  } catch (err) {
    console.warn('[SyncReports] Reddit feed fetch failed:', err?.message || err);
  }

  // 2. Cointelegraph Security RSS
  try {
    const res = await fetch('https://cointelegraph.com/rss/tag/security', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ToxicologyArchive/1.0',
        'Accept': 'application/rss+xml, text/xml;q=0.9'
      }
    });
    if (res.ok) {
      const xml = await res.text();
      const items = parseRssItems(xml);
      items.forEach(i => candidates.push({ ...i, source: 'Cointelegraph Security' }));
    }
  } catch (err) {
    console.warn('[SyncReports] Cointelegraph RSS fetch failed:', err?.message || err);
  }

  // 3. Decrypt Feed
  try {
    const res = await fetch('https://decrypt.co/feed', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ToxicologyArchive/1.0',
        'Accept': 'application/rss+xml, text/xml;q=0.9'
      }
    });
    if (res.ok) {
      const xml = await res.text();
      const items = parseRssItems(xml);
      items
        .filter(i => /hack|drain|scam|exploit|stolen|phish|vulnerability|attack/i.test(i.title + i.snippet))
        .forEach(i => candidates.push({ ...i, source: 'Decrypt Feed' }));
    }
  } catch (err) {
    console.warn('[SyncReports] Decrypt RSS fetch failed:', err?.message || err);
  }

  return candidates;
}

/**
 * Normalizes title for deduplication comparison
 */
function normalizeString(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 45);
}

/**
 * Diagnoses a new candidate using strictly gemini-2.5-flash with NO tools / grounding
 * and exponential backoff retry on HTTP 429
 */
async function diagnoseIncidentWithGemini(ai, candidate) {
  const prompt = `You are the lead forensic researcher at Toxicology Archive (@toxicologyavp).
Analyze this recent Web3 security incident / scam report and produce a clinical, structured Toxicology Report.

Incident Title: ${candidate.title}
Incident Source URL: ${candidate.link}
Content Summary: ${candidate.snippet}

Return ONLY a single valid JSON object with EXACTLY this structure (no markdown wrappers, no backticks, no comments):
{
  "id": "short-slug-name-with-hyphens",
  "date": "${new Date().toISOString().slice(0, 10)}",
  "title": "Sharp, clinical headline describing the incident and mechanism",
  "threatCategory": "Phishing & Wallet Drainer" | "Smart Contract Exploit" | "Address Poisoning" | "Social Engineering" | "Liquidity / Rug Trap",
  "severity": "CRITICAL" | "HIGH" | "MODERATE",
  "symptom": "What users experienced on the surface in 1-2 sentences.",
  "diagnosis": "Root technical or human-layer cause in 2-3 clinical sentences.",
  "antidote": [
    "Step 1: First exact preventative checklist rule",
    "Step 2: Second exact mitigation step",
    "Step 3: Third exact defense practice"
  ],
  "sourceUrl": "${candidate.link}"
}`;

  const retryDelays = [2000, 4000];

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      // Strictly uses gemini-2.5-flash without paid googleSearch tool
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          systemInstruction: 'You produce strictly valid JSON matching the schema for @toxicologyavp security briefs. Signal over noise, clinical tone.'
        }
      });

      const raw = response.text || '';
      const cleanJson = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Validate required keys
      if (!parsed.title || !parsed.threatCategory || !parsed.symptom || !parsed.diagnosis || !Array.isArray(parsed.antidote)) {
        throw new Error('Incomplete JSON schema returned from Gemini');
      }

      parsed.id = parsed.id || `report-${Date.now().toString(36)}`;
      parsed.sourceUrl = candidate.link || parsed.sourceUrl || 'https://rekt.news';
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = /429|resource_exhausted|rate\s*limit|quota/i.test(msg);

      if (is429 && attempt < retryDelays.length) {
        const wait = retryDelays[attempt];
        console.warn(`[SyncReports] 429 rate limit. Retrying after ${wait}ms...`);
        await delay(wait);
        continue;
      }

      throw err;
    }
  }
}

/**
 * Main execution pipeline
 */
export async function runSyncReportsPipeline() {
  const currentData = loadPersistedReports();
  const existingReports = currentData.reports || [];

  const existingUrls = new Set(existingReports.map(r => r.sourceUrl).filter(Boolean));
  const existingTitles = new Set(existingReports.map(r => normalizeString(r.title)));

  // Fetch from public RSS and JSON feeds
  const rawCandidates = await fetchPublicIncidentCandidates();

  // Deduplicate against existing archive
  const newCandidates = [];
  for (const cand of rawCandidates) {
    if (!cand.title || !cand.link) continue;
    if (existingUrls.has(cand.link)) continue;
    const norm = normalizeString(cand.title);
    if (existingTitles.has(norm)) continue;

    existingUrls.add(cand.link);
    existingTitles.add(norm);
    newCandidates.push(cand);

    // Limit to max 2 new items per sync to strictly preserve free-tier quota & speed
    if (newCandidates.length >= 2) break;
  }

  // If no new incidents found, return existing reports
  if (newCandidates.length === 0) {
    currentData.lastSyncTimestamp = new Date().toISOString();
    savePersistedReports(currentData);
    return {
      success: true,
      newCount: 0,
      reports: currentData.reports,
      lastSyncTimestamp: currentData.lastSyncTimestamp,
      message: 'Archive is fully up to date with latest security feeds.'
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      newCount: 0,
      reports: currentData.reports,
      lastSyncTimestamp: currentData.lastSyncTimestamp,
      error: 'GEMINI_API_KEY is not configured.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }
    }
  });

  const newlyDiagnosed = [];

  for (let i = 0; i < newCandidates.length; i++) {
    const candidate = newCandidates[i];
    try {
      const diagnosed = await diagnoseIncidentWithGemini(ai, candidate);
      newlyDiagnosed.push(diagnosed);
    } catch (err) {
      console.warn(`[SyncReports] Could not diagnose candidate "${candidate.title}":`, err?.message || err);
    }

    // Strictly enforce 4-second delay between sequential calls to guarantee free-tier RPM safety
    if (i < newCandidates.length - 1) {
      console.log('[SyncReports] Pausing 4 seconds for free-tier RPM safety...');
      await delay(4000);
    }
  }

  const updatedReports = [...newlyDiagnosed, ...existingReports];
  const updatedPayload = {
    lastSyncTimestamp: new Date().toISOString(),
    reports: updatedReports
  };

  savePersistedReports(updatedPayload);

  return {
    success: true,
    newCount: newlyDiagnosed.length,
    reports: updatedReports,
    lastSyncTimestamp: updatedPayload.lastSyncTimestamp,
    message: newlyDiagnosed.length > 0
      ? `Successfully diagnosed and archived ${newlyDiagnosed.length} new Web3 threat incident(s).`
      : 'No new unique threats found in public feeds.'
  };
}
