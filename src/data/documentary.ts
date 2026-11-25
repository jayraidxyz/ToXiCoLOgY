export type SceneId =
  | 'hook'
  | 'flashcards'
  | 'protocol'
  | 'users'
  | 'bigger-picture'
  | 'outro';

export interface SceneSpec {
  id: SceneId;
  number: string;
  title: string;
  startSec: number;
  endSec: number;
  voiceover: string;
  soundCue: string;
}

export interface FlashcardSpec {
  id: string;
  code: string;
  front: string;
  back: string;
  detail: string;
  flipOffsetSec: number;
}

export interface UserAssetSpec {
  id: string;
  label: string;
  summary: string;
  lockOffsetSec: number;
}

export const TOTAL_DURATION = 55;

export const SCENES: SceneSpec[] = [
  {
    id: 'hook',
    number: '01',
    title: 'The Shift',
    startSec: 0,
    endSec: 5,
    voiceover:
      'Solana just dropped Mainnet Beta. Welcome to Solana 1.0—and no, you do not need to migrate anything.',
    soundCue: 'Low sub-bass drop + clean metallic chime',
  },
  {
    id: 'flashcards',
    number: '02',
    title: 'What Actually Changed',
    startSec: 5,
    endSec: 20,
    voiceover:
      'Mainnet Beta never meant testnet. It meant one validator client and growing pains. Solana 1.0 marks multi-client resilience and stable fee markets.',
    soundCue: '3 crisp 3D card whoosh & click cues',
  },
  {
    id: 'protocol',
    number: '03',
    title: 'Under the Hood',
    startSec: 20,
    endSec: 32,
    voiceover:
      'Under the hood, Agave and Firedancer run side by side while QUIC and local fee markets isolate spam from real transactions.',
    soundCue: 'Network heartbeat pulse every 2.2s',
  },
  {
    id: 'users',
    number: '04',
    title: 'What Stays Unchanged',
    startSec: 32,
    endSec: 42,
    voiceover:
      'For regular users, nothing breaks. Same wallet address, same SOL balance, same tokens and NFTs, same live smart contracts.',
    soundCue: '4 tactile security lock clicks',
  },
  {
    id: 'bigger-picture',
    number: '05',
    title: 'The Bigger Picture',
    startSec: 42,
    endSec: 50,
    voiceover:
      'From 2020 speed experiments to 2026 production infrastructure, retiring Beta tells institutions the training wheels are officially off.',
    soundCue: 'Rising harmonic pulse',
  },
  {
    id: 'outro',
    number: '06',
    title: 'Signal, Not Noise',
    startSec: 50,
    endSec: 55,
    voiceover:
      'Check the full checklist in the Toxicology Archive. Signal, not noise.',
    soundCue: 'Warm bass resolve + crown chime',
  },
];

export const FLASHCARDS: FlashcardSpec[] = [
  {
    id: 'card-beta',
    code: '01',
    front: 'Did Mainnet Beta mean fake money?',
    back: 'No. Real SOL and live apps ran on it from day one.',
    detail: 'The Beta tag signaled early single-client architecture.',
    flipOffsetSec: 2.5,
  },
  {
    id: 'card-clients',
    code: '02',
    front: 'Why does Solana 1.0 matter now?',
    back: 'Independent clients (Agave + Firedancer) remove single-bug outages.',
    detail: 'Client diversity protects uptime under heavy load.',
    flipOffsetSec: 7.0,
  },
  {
    id: 'card-migration',
    code: '03',
    front: 'Do users swap tokens or move wallets?',
    back: 'Never. Ignore any DM or site asking you to migrate SOL.',
    detail: 'Zero token swap, zero bridge, zero new seed phrase.',
    flipOffsetSec: 11.5,
  },
];

export const USER_ASSETS: UserAssetSpec[] = [
  {
    id: 'asset-wallet',
    label: 'Wallet Addresses',
    summary: 'Your Phantom, Solflare, and hardware keys stay identical.',
    lockOffsetSec: 1.5,
  },
  {
    id: 'asset-sol',
    label: 'SOL Balances',
    summary: 'Spot SOL and staked positions carry forward with zero swap.',
    lockOffsetSec: 3.5,
  },
  {
    id: 'asset-tokens',
    label: 'Tokens & NFTs',
    summary: 'Every SPL token, memecoin, and NFT stays in your wallet.',
    lockOffsetSec: 5.5,
  },
  {
    id: 'asset-contracts',
    label: 'Live Protocols',
    summary: 'DEXs, lending vaults, and programs keep running uninterrupted.',
    lockOffsetSec: 7.5,
  },
];

export const SOCIAL_CAPTION = `Solana just retired "Mainnet Beta" for Solana 1.0.

Quick reality check:
01. Your wallet address stays the same
02. Your SOL, tokens, and NFTs stay untouched
03. There is NO token migration (ignore scam links)

Full 55-second breakdown + checklist archived at @toxicologyavp.`;
