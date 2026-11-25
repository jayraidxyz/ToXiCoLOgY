export type DocumentCategory =
  | 'Checklists'
  | 'Breakdowns'
  | 'Research Notes'
  | 'Saved Files';

export interface ArchiveDocument {
  id: string;
  code: string;
  title: string;
  category: DocumentCategory;
  publishedAt: string;
  readTime: string;
  summary: string;
  content: string;
  tweetDraft: string;
  fileName: string;
  attachmentDataUrl?: string;
  attachmentType?: string;
  attachmentSize?: string;
  isCustom?: boolean;
  interactiveTargetId?: string;
}

export interface Web3FilterStep {
  number: '01' | '02' | '03';
  question: string;
  guidance: string;
  passSignal: string;
  redFlag: string;
}

export interface PartnershipFormat {
  id: string;
  number: '01' | '02' | '03';
  title: string;
  deliverable: string;
  turnaround: string;
  disclosure: string;
}

export const X_PROFILE = {
  handle: '@toxicologyavp',
  archiveName: 'Toxicology Archive',
  location: 'Web3 & Crypto Research',
  tagline: 'Clean Web3 checklists, archived breakdowns, and signal over noise.',
  avatarPath:
    '/assets/aistudio/06ca4e8991799574c6283311e3e5990e_0dac84fe_0dac84fe.jpg',
  xUrl: 'https://x.com/toxicologyavp',
  telegramUrl: 'https://t.me/toxicologyavp',
  telegramLabel: 't.me/toxicologyavp',
} as const;

export const WEB3_FILTER_STEPS: Web3FilterStep[] = [
  {
    number: '01',
    question: 'Who gets paid when this grows?',
    guidance:
      'Trace real fee flows before reading a single roadmap slide. Separate protocol revenue from token emissions and insider cliffs.',
    passSignal:
      'Fees accrue transparently to active stakers, LPs, or treasury burn with clear vesting.',
    redFlag:
      'Yield depends purely on new token emissions while insiders hold unlocked supply.',
  },
  {
    number: '02',
    question: 'What breaks first under 10x load?',
    guidance:
      'Ignore peak TPS screenshots. Inspect sequencer centralization, oracle lag, bridge custody, and liquidation queues during volatility.',
    passSignal:
      'Documented circuit breakers, multi-client fallback, and battle-tested oracle bounds.',
    redFlag:
      'Single-multisig admin keys, unproven custom bridges, or hidden pause switches.',
  },
  {
    number: '03',
    question: 'Would anyone use it without points?',
    guidance:
      'Strip away airdrop farming and rebate campaigns. Ask whether organic users still pay fees after incentives go to zero.',
    passSignal:
      'Repeat volume, organic fee payers, and sticky workflows outside incentive epochs.',
    redFlag:
      'Wash volume spikes tied strictly to points multipliers and zero post-TGE retention.',
  },
];

export const FEATURED_THREAD_TWEET =
  'Most Web3 news tries to sound complicated so you do not notice nothing happened.\n\nRun every new token or protocol through the 3-Step Web3 Filter first:';

export const INITIAL_ARCHIVE_DOCS: ArchiveDocument[] = [
  {
    id: 'doc-3step-filter',
    code: 'DOC-01',
    title: 'The 3-Step Web3 Filter Checklist',
    category: 'Checklists',
    publishedAt: 'Nov 2026',
    readTime: '2 min read',
    summary:
      'A repeatable 3-question due-diligence screen for evaluating new protocols, token launches, and ecosystem narratives.',
    content: `# THE 3-STEP WEB3 FILTER (@toxicologyavp)

Most Web3 threads bury weak fundamentals under technical jargon.
Run these three checks before allocating capital or sharing a narrative:

01. WHO GETS PAID WHEN THIS GROWS?
- Trace where real protocol fees go vs. where token inflation goes.
- Verify insider unlock schedules, foundation wallets, and market-maker loans.

02. WHAT BREAKS FIRST UNDER 10X LOAD?
- Check bridge custody, sequencer uptime, and oracle latency under volatility.
- Confirm whether a single multisig can halt withdrawals or alter fees.

03. WOULD ANYONE USE IT WITHOUT POINTS?
- Look for organic fee-paying users outside airdrop campaigns.
- Compare retention 30 days after incentive emissions drop.`,
    tweetDraft:
      'Before aping or reposting any new protocol thread, run it through the @toxicologyavp 3-Step Web3 Filter:',
    fileName: '3-step-web3-filter.md',
    interactiveTargetId: 'three-step-filter',
  },
  {
    id: 'doc-solana-1-0',
    code: 'DOC-02',
    title: 'Solana 1.0 Explained: Mainnet Beta to Production',
    category: 'Breakdowns',
    publishedAt: 'Nov 2026',
    readTime: '55s Watch',
    summary:
      'Interactive 9:16 documentary and flashcard deck explaining why Solana retired the Mainnet Beta label and what stays unchanged for users.',
    content: `# SOLANA 1.0 EXPLAINED — RESEARCH BRIEF

KEY TAKEAWAY:
Retiring "Mainnet Beta" is a maturity and governance milestone, not a breaking chain reset.

01. WHAT CHANGED AT THE PROTOCOL LAYER
- Independent validator clients (Agave & Firedancer) reduce single-client risk.
- Local fee markets and QUIC congestion handling stabilize execution under spikes.

02. WHAT STAYS UNCHANGED FOR USERS
- Wallet addresses and seed phrases remain identical.
- SOL balances, SPL tokens, NFTs, and active smart contracts stay live with zero migration.`,
    tweetDraft:
      'Solana retired "Mainnet Beta" for Solana 1.0 — no token swap, no wallet migration, no downtime. Full 55s visual breakdown:',
    fileName: 'solana-1-0-explained.md',
    interactiveTargetId: 'solana-breakdown',
  },
  {
    id: 'doc-l2-fees',
    code: 'DOC-03',
    title: 'L2 Sequencer & Blob Fee Reality Check',
    category: 'Research Notes',
    publishedAt: 'Oct 2026',
    readTime: '4 min read',
    summary:
      'Comparing L2 gross transaction fees against L1 data-availability costs and single-sequencer bottleneck risks.',
    content: `# L2 SEQUENCER & BLOB FEE REALITY CHECK

01. FEE MARGIN STRUCTURE
- Track user gas paid vs. L1 blob posting settlement cost.
- Separate one-off foundation rebates from net sequencer margin.

02. LIVENESS & EXIT GUARANTEES
- Verify permissionless forced-inclusion paths on Ethereum L1.
- Confirm whether state proofs are live or behind a security council override.`,
    tweetDraft:
      'Cheap L2 swaps are great until the single sequencer stalls. Here is the quick L2 fee & exit checklist:',
    fileName: 'l2-sequencer-reality-check.md',
  },
  {
    id: 'doc-stablecoin-stress',
    code: 'DOC-04',
    title: 'Stablecoin Peg & Liquidity Stress Notes',
    category: 'Research Notes',
    publishedAt: 'Oct 2026',
    readTime: '3 min read',
    summary:
      'How to inspect collateral backing, redemption queues, and DEX pool depth before parking size in synthetic or fiat-backed stablecoins.',
    content: `# STABLECOIN PEG & LIQUIDITY STRESS NOTES

01. PRIMARY REDEMPTION PATH
- Can anyone mint/redeem 1:1 with underlying collateral, or only whitelisted desks?
- Check settlement window during weekends and bank holidays.

02. SECONDARY MARKET DEPTH
- Measure 2% slippage depth on primary DEX pools before relying on a peg.`,
    tweetDraft:
      'Yield on a stablecoin means nothing if redemption stalls during a weekend drawdown. Quick stress checklist:',
    fileName: 'stablecoin-stress-notes.md',
  },
  {
    id: 'doc-token-unlocks',
    code: 'DOC-05',
    title: 'Token Unlock & Insider Float Audit Sheet',
    category: 'Saved Files',
    publishedAt: 'Sep 2026',
    readTime: '2 min read',
    summary:
      'Quick reference template to compare circulating float, FDV overhang, and ecosystem emissions before buying spot.',
    content: `# TOKEN UNLOCK & INSIDER FLOAT AUDIT SHEET

- Circulating Supply vs. FDV Ratio (%)
- Next 90-day cliff unlocks (Team, Seed, Advisors)
- Real protocol fee buyback or revenue share (Yes / No)
- Market-maker call options & OTC discount windows`,
    tweetDraft:
      'Low float + high FDV is still the oldest trap in crypto. Save this quick token unlock audit sheet:',
    fileName: 'token-unlock-audit-sheet.md',
  },
];

export const PARTNERSHIP_FORMATS: PartnershipFormat[] = [
  {
    id: 'sponsored-breakdown',
    number: '01',
    title: 'Interactive 9:16 Breakdown',
    deliverable:
      'Custom 55-second visual documentary + flashcard deck hosted in the Archive and shared on X.',
    turnaround: '5–7 business days',
    disclosure: 'Clearly labeled Sponsored Research',
  },
  {
    id: 'checklist-brief',
    number: '02',
    title: 'Verified Protocol Brief',
    deliverable:
      'Dedicated deep-dive document with downloadable checklist, security verification notes, and X thread.',
    turnaround: '3–4 business days',
    disclosure: 'Editorial independence preserved',
  },
  {
    id: 'archive-sponsorship',
    number: '03',
    title: 'Archive Series Partner',
    deliverable:
      'Monthly partner placement across the 3-Step Filter brief, X repost curation, and Telegram digest.',
    turnaround: 'Monthly cadence',
    disclosure: 'Full sponsorship disclosure',
  },
];
