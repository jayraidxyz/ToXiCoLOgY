import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  Cloud,
  CloudCheck,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Paperclip,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  INITIAL_ARCHIVE_DOCS,
  X_PROFILE,
  type ArchiveDocument,
  type DocumentCategory,
} from '../data/archive';
import { MascotAvatar } from './CrownMark';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input, Textarea } from './ui/input';
import {
  deleteUserDoc,
  getUserDocs,
  getUserThreatReports,
  saveUserDoc,
  saveUserThreatReport,
} from '../lib/firebase';

const STORAGE_KEY = 'toxicology_archive_docs_v1';
const THREATS_STORAGE_KEY = 'toxicology_threat_reports_v1';
const THREATS_LAST_SYNC_KEY = 'toxicology_threat_last_sync_v1';

export interface ToxicologyReport {
  id: string;
  date: string;
  title: string;
  threatCategory: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | string;
  symptom: string;
  diagnosis: string;
  antidote: string[];
  sourceUrl: string;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never scanned';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 45 * 1000) return 'Just now';
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } catch {
    return 'Recently';
  }
}

const CATEGORIES: ('All' | DocumentCategory)[] = [
  'All',
  'Checklists',
  'Breakdowns',
  'Research Notes',
  'Saved Files',
];

interface ArchiveVaultSectionProps {
  onJumpToTarget: (targetId: string) => void;
  user?: User | null;
  onOpenLogin?: () => void;
}

export function ArchiveVaultSection({
  onJumpToTarget,
  user,
  onOpenLogin,
}: ArchiveVaultSectionProps) {
  const [customDocs, setCustomDocs] = useState<ArchiveDocument[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ArchiveDocument[]) : [];
    } catch {
      return [];
    }
  });

  const [categoryFilter, setCategoryFilter] =
    useState<'All' | DocumentCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-3step-filter');
  const [missingDocHash, setMissingDocHash] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Live Threat Reports State
  const [vaultTab, setVaultTab] = useState<'briefs' | 'threats'>('briefs');
  const [threatReports, setThreatReports] = useState<ToxicologyReport[]>([]);
  const [lastThreatSync, setLastThreatSync] = useState<string | null>(null);
  const [isScanningThreats, setIsScanningThreats] = useState(false);
  const [threatScanNotice, setThreatScanNotice] = useState<string | null>(null);
  const [copiedThreadId, setCopiedThreadId] = useState<string | null>(null);
  const [savedThreatDocId, setSavedThreatDocId] = useState<string | null>(null);
  const [threatFilter, setThreatFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE'>('ALL');

  /**
   * syncArchive:
   * Pushes local storage data to the user's Firestore collection when authenticated,
   * retrieves cloud-persisted documents, and merges them so the document vault
   * is identical and available across devices.
   */
  const syncArchive = useCallback(async (): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> => {
    if (!user?.uid) {
      if (onOpenLogin) {
        onOpenLogin();
      }
      return { success: false, count: 0, error: 'User not authenticated' };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Read existing local storage data to ensure any offline files/briefs are included
      let localItems: ArchiveDocument[] = [];
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localItems = parsed;
          }
        }
      } catch (err) {
        console.warn('Error reading local storage during syncArchive:', err);
      }

      // Merge currently loaded state items with raw local storage items
      const localMap = new Map<string, ArchiveDocument>();
      customDocs.forEach((doc) => localMap.set(doc.id, doc));
      localItems.forEach((doc) => localMap.set(doc.id, doc));
      const combinedLocal = Array.from(localMap.values());

      // 2. Push all local storage documents to the user's Firestore collection
      for (const docItem of combinedLocal) {
        await saveUserDoc(user.uid, docItem);
      }

      // 3. Fetch remote documents stored in Firestore for this user
      const remoteDocs = await getUserDocs(user.uid);

      // 4. Merge remote and local documents so vault is consistent across all devices
      const unifiedMap = new Map<string, ArchiveDocument>();
      remoteDocs.forEach((doc) => unifiedMap.set(doc.id, doc));
      combinedLocal.forEach((doc) => unifiedMap.set(doc.id, doc));
      const unifiedList = Array.from(unifiedMap.values());

      // Update state and refresh local storage
      setCustomDocs(unifiedList);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unifiedList));
      } catch (err) {
        console.warn('LocalStorage quota warning in syncArchive:', err);
      }

      // 5. Also sync diagnosed live threat reports to/from Firestore subcollection
      let localThreats: ToxicologyReport[] = [];
      try {
        const storedThreats = window.localStorage.getItem(THREATS_STORAGE_KEY);
        if (storedThreats) {
          const parsedThreats = JSON.parse(storedThreats);
          if (Array.isArray(parsedThreats)) {
            localThreats = parsedThreats;
          }
        }
      } catch (err) {
        console.warn('Error reading threat reports from localStorage:', err);
      }

      const localThreatMap = new Map<string, ToxicologyReport>();
      threatReports.forEach((r) => localThreatMap.set(r.id, r));
      localThreats.forEach((r) => localThreatMap.set(r.id, r));
      const combinedLocalThreats = Array.from(localThreatMap.values());

      for (const threatItem of combinedLocalThreats) {
        await saveUserThreatReport(user.uid, threatItem);
      }

      const remoteThreats = await getUserThreatReports(user.uid);
      if (remoteThreats.length > 0 || combinedLocalThreats.length > 0) {
        const unifiedThreatMap = new Map<string, ToxicologyReport>();
        remoteThreats.forEach((r) => unifiedThreatMap.set(r.id, r));
        combinedLocalThreats.forEach((r) => unifiedThreatMap.set(r.id, r));
        const unifiedThreats = Array.from(unifiedThreatMap.values()).sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
        setThreatReports(unifiedThreats);
        try {
          window.localStorage.setItem(
            THREATS_STORAGE_KEY,
            JSON.stringify(unifiedThreats)
          );
        } catch {}
      }

      setIsCloudSynced(true);
      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastSyncedTime(timestamp);
      return { success: true, count: unifiedList.length };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to sync archive to Firestore';
      console.error('syncArchive error:', err);
      setSyncError(msg);
      return { success: false, count: 0, error: msg };
    } finally {
      setIsSyncing(false);
    }
  }, [user, customDocs, threatReports, onOpenLogin]);

  // Synchronize document vault on sign-in
  useEffect(() => {
    if (user?.uid) {
      void syncArchive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  /**
   * syncLiveThreats:
   * Triggers the automated Web3 incident ingestion & Gemini diagnosis pipeline.
   * Runs sequentially on free tier with 4s delay + 429 backoff.
   */
  const syncLiveThreats = useCallback(async (manual = false) => {
    setIsScanningThreats(true);
    setThreatScanNotice(null);

    try {
      const response = await fetch('/api/sync-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.reports)) {
        setThreatReports(data.reports);
        setLastThreatSync(data.lastSyncTimestamp || new Date().toISOString());
        try {
          window.localStorage.setItem(THREATS_STORAGE_KEY, JSON.stringify(data.reports));
          window.localStorage.setItem(THREATS_LAST_SYNC_KEY, data.lastSyncTimestamp || new Date().toISOString());
        } catch {}
      }

      if (manual) {
        setThreatScanNotice(data.message || 'Live threat scan complete.');
        setTimeout(() => setThreatScanNotice(null), 4500);
      }
    } catch (err: unknown) {
      console.warn('Live threat scan error:', err);
      // Fallback: try reading the cached/seeded JSON directly
      try {
        const fallbackRes = await fetch('/data/live-toxicology-reports.json');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData.reports)) {
            setThreatReports(fallbackData.reports);
            setLastThreatSync(fallbackData.lastSyncTimestamp || new Date().toISOString());
          }
        }
      } catch {}

      if (manual) {
        setThreatScanNotice(err instanceof Error ? err.message : 'Scan check failed');
        setTimeout(() => setThreatScanNotice(null), 4500);
      }
    } finally {
      setIsScanningThreats(false);
    }
  }, []);

  // Hydrate threat reports & run automatic background check if older than 6 hours
  useEffect(() => {
    let cachedReports: ToxicologyReport[] = [];
    let cachedTimestamp: string | null = null;
    try {
      const stored = window.localStorage.getItem(THREATS_STORAGE_KEY);
      if (stored) cachedReports = JSON.parse(stored);
      cachedTimestamp = window.localStorage.getItem(THREATS_LAST_SYNC_KEY);
    } catch {}

    if (cachedReports.length > 0) {
      setThreatReports(cachedReports);
      setLastThreatSync(cachedTimestamp);
    } else {
      fetch('/api/sync-reports')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.reports)) {
            setThreatReports(data.reports);
            setLastThreatSync(data.lastSyncTimestamp || new Date().toISOString());
          }
        })
        .catch(() => {
          fetch('/data/live-toxicology-reports.json')
            .then((r) => r.json())
            .then((d) => {
              if (Array.isArray(d.reports)) {
                setThreatReports(d.reports);
                setLastThreatSync(d.lastSyncTimestamp);
              }
            })
            .catch(() => {});
        });
    }

    // Auto-check if last sync > 6 hours ago (6 * 3600 * 1000 ms)
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const isStale = !cachedTimestamp || Date.now() - new Date(cachedTimestamp).getTime() > SIX_HOURS_MS;
    if (isStale) {
      console.log('[ToxicologyArchive] Last threat scan > 6h old. Running automated background sync...');
      void syncLiveThreats(false);
    }
  }, [syncLiveThreats]);

  // Copy X Thread breakdown format for @toxicologyavp
  const handleCopyThread = async (report: ToxicologyReport) => {
    const threadContent = `🚨 TOXICOLOGY REPORT · ${report.severity}
${report.title}
Threat: ${report.threatCategory} · Date: ${report.date}

1. Surface Symptom:
${report.symptom}

2. Forensic Diagnosis:
${report.diagnosis}

3. Antidote Protocol:
• Step 1: ${report.antidote[0] || 'Verify transaction data before signing.'}
• Step 2: ${report.antidote[1] || 'Inspect contract allowances & bytecode.'}
• Step 3: ${report.antidote[2] || 'Apply the 3-Step Web3 Filter.'}

Source report: ${report.sourceUrl}
Signal, not noise. @toxicologyavp`;

    try {
      await navigator.clipboard.writeText(threadContent);
      setCopiedThreadId(report.id);
      setTimeout(() => setCopiedThreadId(null), 2500);
    } catch {
      setCopiedThreadId(null);
    }
  };

  // New Document / File Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] =
    useState<DocumentCategory>('Saved Files');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTweetDraft, setNewTweetDraft] = useState('');
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    dataUrl: string;
    type: string;
    size: string;
    textPreview?: string;
  } | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customDocs));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [customDocs]);

  const allDocs = useMemo(
    () => [...customDocs, ...INITIAL_ARCHIVE_DOCS],
    [customDocs]
  );

  // Handle direct #doc=... links & show 404 mascot recovery if unknown document ID
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#doc=')) {
        const id = decodeURIComponent(hash.replace('#doc=', ''));
        if (allDocs.some((d) => d.id === id)) {
          setMissingDocHash(null);
          setSelectedDocId(id);
        } else {
          setMissingDocHash(id);
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [allDocs]);

  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const matchesCat =
        categoryFilter === 'All' || doc.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.code.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [allDocs, categoryFilter, searchQuery]);

  const activeDoc =
    allDocs.find((d) => d.id === selectedDocId) ?? filteredDocs[0] ?? allDocs[0];

  const getDocShareUrl = (docId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#doc=${encodeURIComponent(
      docId
    )}`;
  };

  const handleCopyShareLink = async (doc: ArchiveDocument) => {
    const shareUrl = getDocShareUrl(doc.id);
    const payload = `${doc.tweetDraft}\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedDocId(doc.id);
      setTimeout(() => setCopiedDocId(null), 2200);
    } catch {
      setCopiedDocId(null);
    }
  };

  const handleDownloadDoc = (doc: ArchiveDocument) => {
    if (doc.attachmentDataUrl) {
      const a = document.createElement('a');
      a.href = doc.attachmentDataUrl;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setFormError('Please keep browser-stored attachments under 1.5 MB.');
      return;
    }

    const sizeLabel =
      file.size < 1024
        ? `${file.size} B`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const isTextLike =
        file.type.startsWith('text/') ||
        /\.(md|txt|json|csv)$/i.test(file.name);

      if (isTextLike) {
        const textReader = new FileReader();
        textReader.onload = () => {
          const textPreview =
            typeof textReader.result === 'string' ? textReader.result : '';
          setAttachedFile({
            name: file.name,
            dataUrl,
            type: file.type || 'text/plain',
            size: sizeLabel,
            textPreview,
          });
          if (!newTitle.trim()) {
            setNewTitle(file.name.replace(/\.[^.]+$/, ''));
          }
          if (!newContent.trim() && textPreview) {
            setNewContent(textPreview);
          }
        };
        textReader.readAsText(file);
      } else {
        setAttachedFile({
          name: file.name,
          dataUrl,
          type: file.type || 'application/octet-stream',
          size: sizeLabel,
        });
        if (!newTitle.trim()) {
          setNewTitle(file.name.replace(/\.[^.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Enter a document title before saving.');
      return;
    }
    if (!newContent.trim() && !attachedFile) {
      setFormError('Add document notes or attach a reference file.');
      return;
    }

    const slug = newTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);
    const newId = `custom-${slug}-${Date.now().toString(36)}`;
    const nextCode = `DOC-${String(allDocs.length + 1).padStart(2, '0')}`;
    const wordCount = (newContent.trim() || newSummary.trim()).split(/\s+/).length;
    const readTime = attachedFile
      ? `${attachedFile.size} File`
      : `${Math.max(1, Math.ceil(wordCount / 180))} min read`;

    const created: ArchiveDocument = {
      id: newId,
      code: nextCode,
      title: newTitle.trim(),
      category: newCategory,
      publishedAt: 'Just added',
      readTime,
      summary:
        newSummary.trim() ||
        'Saved reference document in Toxicology Archive (@toxicologyavp).',
      content:
        newContent.trim() ||
        `# ${newTitle.trim()}\n\nAttached reference file: ${attachedFile?.name} (${attachedFile?.size}).`,
      tweetDraft:
        newTweetDraft.trim() ||
        `New breakdown saved in the Toxicology Archive: ${newTitle.trim()}\n\nCheck the full brief and notes here:`,
      fileName: attachedFile?.name || `${slug || 'archive-brief'}.md`,
      attachmentDataUrl: attachedFile?.dataUrl,
      attachmentType: attachedFile?.type,
      attachmentSize: attachedFile?.size,
      isCustom: true,
    };

    setCustomDocs((prev) => [created, ...prev]);
    setSelectedDocId(created.id);
    setMissingDocHash(null);
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewTweetDraft('');
    setAttachedFile(null);
    setFormError('');
    setShowAddForm(false);

    // If authenticated, push newly created document directly to Firestore
    if (user?.uid) {
      void saveUserDoc(user.uid, created)
        .then(() => setIsCloudSynced(true))
        .catch((err) => console.error('Failed to auto-save to cloud:', err));
    } else {
      setIsCloudSynced(false);
    }
  };

  const handleDeleteCustomDoc = (id: string) => {
    setCustomDocs((prev) => prev.filter((d) => d.id !== id));
    if (user?.uid) {
      void deleteUserDoc(user.uid, id).catch((err) =>
        console.error('Failed to delete from Firestore:', err)
      );
    }
    if (selectedDocId === id) {
      setSelectedDocId('doc-3step-filter');
    }
  };

  const filteredThreats = useMemo(() => {
    return threatReports.filter((r) => {
      if (threatFilter === 'ALL') return true;
      return r.severity.toUpperCase() === threatFilter;
    });
  }, [threatReports, threatFilter]);

  return (
    <Card id="archive-vault" className="scroll-mt-28 p-4 sm:p-6">
      {/* Header Row with Sync Status Badge & syncArchive Trigger */}
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
              PERMANENT REFERENCE REPOSITORY
            </p>
            {isSyncing ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/60 bg-[var(--accent)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-text)] shadow-[0_0_12px_var(--accent-glow)]"
                title="syncArchive active: Pushing local data to Firestore"
              >
                <RefreshCw className="h-2.5 w-2.5 animate-spin text-[var(--accent-text)]" />
                <span>Pushing to Firestore...</span>
              </span>
            ) : customDocs.length === 0 || isCloudSynced ? (
              <div className="inline-flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400"
                  title={
                    isCloudSynced
                      ? `Cloud synced with Firestore (${user?.email || 'Authenticated'})`
                      : 'Local storage matches default hardcoded archive'
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Synced
                </span>
                {user && (
                  <button
                    type="button"
                    onClick={() => void syncArchive()}
                    disabled={isSyncing}
                    className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-[10px] font-bold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] disabled:opacity-50"
                    title={`Re-sync archive across devices${lastSyncedTime ? ` · Last synced ${lastSyncedTime}` : ''}`}
                  >
                    <RefreshCw
                      className={`h-2.5 w-2.5 ${isSyncing ? 'animate-spin text-[var(--accent-text)]' : ''}`}
                    />
                    <span>{isSyncing ? 'Syncing...' : lastSyncedTime ? `Synced ${lastSyncedTime}` : 'Sync Archive'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-text)]"
                  title={`${customDocs.length} custom file(s) saved in local storage vs hardcoded document list`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  Needs Sync
                </span>
                <button
                  type="button"
                  onClick={() => void syncArchive()}
                  disabled={isSyncing}
                  className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-[var(--accent)]/50 bg-[var(--surface-2)] px-2 text-[10px] font-bold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent)] hover:text-white disabled:opacity-50"
                  title={user ? 'Push local storage to Firestore' : 'Sign in with Firebase to sync archive'}
                >
                  <RefreshCw
                    className={`h-2.5 w-2.5 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  <span>{isSyncing ? 'Syncing...' : user ? 'Sync Archive' : 'Connect & Sync'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Subtle Syncing Indicator Banner while syncArchive is active */}
          {isSyncing && (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1.5 text-xs text-[var(--accent-text)] animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin shrink-0 text-[var(--accent-text)]" />
              <span>Pushing local storage data to user Firestore collection (`users/{user?.uid}/savedDocs`)...</span>
            </div>
          )}

          {syncError && (
            <p className="mt-1 text-xs text-[var(--accent-text)]">
              {syncError}
            </p>
          )}

          <h2 className="heading-section mt-1.5 font-display font-bold tracking-tight text-[var(--text)]">
            Document &amp; File Archive
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Verified checklists, live Web3 incident autopsies, and downloadable files from{' '}
            <span className="font-mono text-[var(--accent-text)]">
              {X_PROFILE.handle}
            </span>
            —signal over noise.
          </p>
        </div>

        {/* View Mode Toggle Button in Desktop Header */}
        <div className="flex flex-wrap items-center gap-2">
          {vaultTab === 'briefs' && (
            <Button
              variant="secondary"
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              {showAddForm ? (
                <>
                  <X className="h-4 w-4" />
                  Close Uploader
                </>
              ) : (
                <>
                  <FilePlus2 className="h-4 w-4 text-[var(--accent-text)]" />
                  Add File or Brief
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Primary Section Segmented Control: Verified Briefs vs Live Threat Archive */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVaultTab('briefs')}
            className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider transition-all ${
              vaultTab === 'briefs'
                ? 'bg-[var(--accent)] text-white shadow-[0_0_16px_var(--accent-glow)]'
                : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Verified Briefs ({allDocs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setVaultTab('threats')}
            className={`relative inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wider transition-all ${
              vaultTab === 'threats'
                ? 'bg-[var(--accent)] text-white shadow-[0_0_16px_var(--accent-glow)]'
                : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]'
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span>Live Threat Reports ({threatReports.length})</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
            </span>
          </button>
        </div>

        {/* Threats Controls: Last Lab Scan Status + Sync Live Threats Button */}
        {vaultTab === 'threats' && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-mono text-xs text-[var(--muted)]"
              title={lastThreatSync || 'Never scanned'}
            >
              <Clock className="h-3.5 w-3.5 text-[var(--accent-text)]" />
              <span>Last lab scan: {formatRelativeTime(lastThreatSync)}</span>
            </span>

            <button
              type="button"
              onClick={() => void syncLiveThreats(true)}
              disabled={isScanningThreats}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--surface-2)] px-3.5 text-xs font-bold text-[var(--text)] transition-colors hover:bg-[var(--accent)] hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[var(--accent-text)] ${
                  isScanningThreats ? 'animate-spin' : ''
                }`}
              />
              <span>{isScanningThreats ? 'Scanning Feeds & Diagnosing...' : 'Sync Live Threats'}</span>
            </button>
          </div>
        )}
      </div>

      {vaultTab === 'briefs' && (
        <>
          {/* Add File / Document Form Drawer */}
          {showAddForm && (
        <form
          onSubmit={handleCreateDocument}
          className="mt-5 space-y-4 rounded-xl border border-[var(--accent)]/60 bg-[var(--bg)] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-[var(--text)]">
              Save New Document or File to Archive
            </h3>
            <span className="text-xs text-[var(--muted)]">
              Saved locally in browser storage
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0">
              <label
                htmlFor="doc-title-input"
                className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
              >
                Document Title
              </label>
              <Input
                id="doc-title-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Base L2 Fee Economics Checklist"
                className="mt-2"
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="doc-category-select"
                className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
              >
                Category
              </label>
              <select
                id="doc-category-select"
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as DocumentCategory)
                }
                className="mt-2 min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-base text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]/60"
              >
                <option value="Saved Files">Saved Files</option>
                <option value="Checklists">Checklists</option>
                <option value="Breakdowns">Breakdowns</option>
                <option value="Research Notes">Research Notes</option>
              </select>
            </div>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="doc-summary-input"
              className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
            >
              One-Line Summary
            </label>
            <Input
              id="doc-summary-input"
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Concise summary for visitors clicking through from X..."
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="doc-content-input"
                className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
              >
                Document Notes / Markdown Brief
              </label>
              <Textarea
                id="doc-content-input"
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste your clean checklist, bullet points, or research notes..."
                className="mt-2 font-mono"
              />
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-3">
              <div>
                <label
                  htmlFor="doc-tweet-input"
                  className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
                >
                  X Post / Tweet Draft (Optional)
                </label>
                <Textarea
                  id="doc-tweet-input"
                  rows={2}
                  value={newTweetDraft}
                  onChange={(e) => setNewTweetDraft(e.target.value)}
                  placeholder="Write the X hook you'll pair with this document's link..."
                  className="mt-2 p-3.5"
                />
              </div>

              <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-1.5">
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--accent-text)] hover:text-[var(--text)]">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="break-words">
                    {attachedFile
                      ? `${attachedFile.name} (${attachedFile.size})`
                      : 'Attach PDF, MD, TXT, or JSON (max 1.5 MB)'}
                  </span>
                  <input
                    type="file"
                    accept=".md,.txt,.json,.csv,.pdf"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                </label>
                {attachedFile && (
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="min-h-[44px] cursor-pointer px-3 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {formError && (
            <p
              className="text-xs font-semibold text-[var(--accent-text)]"
              role="alert"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="subtle" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save to Archive
            </Button>
          </div>
        </form>
      )}

      {/* Filter Pills & Search Toolbar */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter archive documents"
          className="flex flex-wrap items-center gap-2"
        >
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[44px] cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_0_14px_var(--accent-glow)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full min-w-0 lg:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search docs or DOC-ID..."
            aria-label="Search archive documents"
            className="bg-[var(--bg)] pl-10 font-mono"
          />
        </div>
      </div>

      {/* Mascot 404 / Missing Hash Recovery State */}
      {missingDocHash && (
        <div
          role="alert"
          className="mt-5 flex flex-col items-center gap-4 rounded-xl border border-[var(--accent)] bg-[var(--bg)] p-5 text-center sm:flex-row sm:text-left"
        >
          <MascotAvatar size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-widest uppercase text-[var(--accent-text)]">
              404 · DOCUMENT NOT FOUND
            </p>
            <h3 className="mt-1 font-display text-lg font-bold text-[var(--text)]">
              We couldn&apos;t find &ldquo;{missingDocHash}&rdquo; in this archive.
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              It may have been removed from local browser storage or renamed.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setMissingDocHash(null);
              setSelectedDocId('doc-3step-filter');
              window.history.replaceState(null, '', '#archive');
            }}
          >
            Return to Archive
          </Button>
        </div>
      )}

      {/* Master-Detail Split: Document List + Live Reader & Tweet Share */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
        {/* Left List */}
        <div className="min-w-0 space-y-3 lg:col-span-5">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 text-center">
              <MascotAvatar size="md" />
              <p className="mt-4 font-display text-lg font-bold text-[var(--text)]">
                No documents match that filter
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Try a different keyword or reset your category filter.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  setCategoryFilter('All');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setMissingDocHash(null);
                    setSelectedDocId(doc.id);
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(
                        null,
                        '',
                        `#doc=${encodeURIComponent(doc.id)}`
                      );
                    }
                  }}
                  className={`min-h-[44px] w-full min-w-0 cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-[0_0_18px_var(--accent-glow)]'
                      : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                    <span>
                      <strong className="font-mono text-[var(--accent-text)]">
                        {doc.code}
                      </strong>{' '}
                      · {doc.category} · {doc.publishedAt}
                    </span>
                    <span className="font-semibold text-[var(--text)]">
                      {doc.readTime}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-base font-bold text-[var(--text)]">
                    {doc.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                    {doc.summary}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right Document Reader & Share Actions */}
        {activeDoc && (
          <div className="flex min-w-0 flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5 lg:col-span-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--accent-text)]">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="break-all font-mono">
                      {activeDoc.code} · {activeDoc.category} ·{' '}
                      {activeDoc.fileName}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-[var(--text)] sm:text-xl">
                    {activeDoc.title}
                  </h3>
                </div>

                {activeDoc.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomDoc(activeDoc.id)}
                    aria-label="Remove saved document"
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>

              <pre className="mt-4 max-h-[320px] max-w-full overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-sans text-sm leading-relaxed text-[var(--text)]">
                {activeDoc.content}
              </pre>
            </div>

            {/* Share & Download Toolbar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="subtle"
                  size="compact"
                  onClick={() => handleDownloadDoc(activeDoc)}
                >
                  <Download className="h-4 w-4 text-[var(--accent-text)]" />
                  Download File
                </Button>

                {activeDoc.interactiveTargetId && (
                  <Button
                    variant="subtle"
                    size="compact"
                    onClick={() => onJumpToTarget(activeDoc.interactiveTargetId!)}
                  >
                    <PlayCircle className="h-4 w-4 text-[var(--accent-text)]" />
                    Open View
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleCopyShareLink(activeDoc)}
                >
                  {copiedDocId === activeDoc.id ? (
                    <>
                      <Check className="h-4 w-4 text-[var(--accent-text)]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>

                <Button asChild variant="primary">
                  <a
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                      activeDoc.tweetDraft
                    )}&url=${encodeURIComponent(getDocShareUrl(activeDoc.id))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tweet Brief
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {vaultTab === 'threats' && (
        <div className="mt-5 space-y-4">
          {/* Status Notice Banner */}
          {threatScanNotice && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-3 text-xs font-semibold text-[var(--accent-text)]"
            >
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 shrink-0" />
                <span>{threatScanNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setThreatScanNotice(null)}
                className="cursor-pointer rounded-md p-1 text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="Dismiss scan notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Severity Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Filter threat reports by severity"
              className="flex flex-wrap items-center gap-2"
            >
              {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE'] as const).map((sev) => {
                const active = threatFilter === sev;
                const count =
                  sev === 'ALL'
                    ? threatReports.length
                    : threatReports.filter((r) => r.severity.toUpperCase() === sev).length;
                return (
                  <button
                    key={sev}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setThreatFilter(sev)}
                    className={`min-h-[40px] cursor-pointer rounded-full border px-4 py-1.5 font-mono text-xs font-bold tracking-wider transition-all ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_0_14px_var(--accent-glow)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                    }`}
                  >
                    {sev} ({count})
                  </button>
                );
              })}
            </div>

            <p className="font-mono text-[11px] text-[var(--muted)]">
              Auto-diagnoses Web3 incidents via <span className="text-[var(--text)]">gemini-2.5-flash</span>
            </p>
          </div>

          {/* Threat Report Cards */}
          {isScanningThreats && threatReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-10 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-text)]" />
              <p className="mt-4 font-display text-base font-bold text-[var(--text)]">
                Scanning Live Web3 Security Feeds...
              </p>
              <p className="mt-1 max-w-md text-xs text-[var(--muted)]">
                Deduplicating incidents and generating forensic Toxicology Reports sequentially.
              </p>
            </div>
          ) : filteredThreats.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-8 text-center">
              <MascotAvatar size="md" />
              <p className="mt-4 font-display text-lg font-bold text-[var(--text)]">
                No threat reports in this severity filter
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Run a live scan or switch back to ALL severities.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {threatFilter !== 'ALL' && (
                  <Button variant="secondary" onClick={() => setThreatFilter('ALL')}>
                    Show All Reports
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => void syncLiveThreats(true)}
                  disabled={isScanningThreats}
                >
                  <RefreshCw className={`h-4 w-4 ${isScanningThreats ? 'animate-spin' : ''}`} />
                  Scan Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredThreats.map((report) => {
                const sevUpper = (report.severity || 'HIGH').toUpperCase();
                const sevStyles =
                  sevUpper === 'CRITICAL'
                    ? 'border-[var(--accent)]/60 bg-[var(--accent)]/15 text-[var(--accent-text)]'
                    : sevUpper === 'HIGH'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
                const vaultDocId = `threat-${report.id}`;
                const isSavedInVault =
                  savedThreatDocId === report.id ||
                  customDocs.some((d) => d.id === vaultDocId);

                const handleSaveThreatToVault = () => {
                  const newDoc: ArchiveDocument = {
                    id: vaultDocId,
                    code: `THREAT-${report.date.replace(/-/g, '').slice(2)}`,
                    title: report.title,
                    category: 'Breakdowns',
                    publishedAt: report.date,
                    readTime: '2 min autopsy',
                    summary: report.symptom,
                    content: `# ${report.title}\n\nSeverity: ${report.severity} · Category: ${report.threatCategory} · Date: ${report.date}\n\n## 1. Surface Symptom\n${report.symptom}\n\n## 2. Forensic Diagnosis\n${report.diagnosis}\n\n## 3. Antidote Protocol\n${report.antidote.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nSource: ${report.sourceUrl}`,
                    tweetDraft: `🚨 TOXICOLOGY REPORT · ${report.severity}\n${report.title}\n\n1. Symptom: ${report.symptom}\n\nFull forensic breakdown:`,
                    fileName: `${report.id}.md`,
                    isCustom: true,
                  };
                  setCustomDocs((prev) => {
                    if (prev.some((d) => d.id === vaultDocId)) return prev;
                    return [newDoc, ...prev];
                  });
                  setSavedThreatDocId(report.id);
                  setTimeout(() => setSavedThreatDocId(null), 2200);
                  if (user?.uid) {
                    void saveUserDoc(user.uid, newDoc)
                      .then(() => setIsCloudSynced(true))
                      .catch((err) => console.error('Failed to save threat to Firestore:', err));
                  }
                };

                return (
                  <article
                    key={report.id}
                    className="flex min-w-0 flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5 transition-colors hover:border-[var(--accent)]/50"
                  >
                    <div className="space-y-3">
                      {/* Card Metadata Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${sevStyles}`}
                          >
                            {sevUpper === 'CRITICAL' ? (
                              <ShieldAlert className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {sevUpper}
                          </span>
                          <span className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
                            {report.threatCategory}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-[var(--muted)]">
                          {report.date}
                        </span>
                      </div>

                      {/* Headline */}
                      <h3 className="font-display text-base font-bold leading-snug text-[var(--text)] sm:text-lg">
                        {report.title}
                      </h3>

                      {/* Surface Symptom */}
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                          01 · Surface Symptom
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text)] sm:text-sm">
                          {report.symptom}
                        </p>
                      </div>

                      {/* Forensic Diagnosis */}
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent-text)]">
                          02 · Forensic Diagnosis
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                          {report.diagnosis}
                        </p>
                      </div>

                      {/* 3-Step Antidote */}
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                          03 · Antidote Protocol
                        </p>
                        <ol className="mt-1.5 space-y-1.5">
                          {report.antidote.map((step, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text)]"
                            >
                              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-mono text-[10px] font-bold text-emerald-400">
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => void handleCopyThread(report)}
                        >
                          {copiedThreadId === report.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              Copied Thread
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                              Copy X Thread
                            </>
                          )}
                        </Button>

                        <Button
                          variant="subtle"
                          size="compact"
                          onClick={handleSaveThreatToVault}
                        >
                          {isSavedInVault ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              Saved to Vault
                            </>
                          ) : (
                            <>
                              <FilePlus2 className="h-3.5 w-3.5" />
                              Save to Vault
                            </>
                          )}
                        </Button>
                      </div>

                      <a
                        href={report.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)]"
                      >
                        <span>Source</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
