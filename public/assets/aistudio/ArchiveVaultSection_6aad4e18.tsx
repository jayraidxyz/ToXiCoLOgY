import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Paperclip,
  PlayCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  INITIAL_ARCHIVE_DOCS,
  X_PROFILE,
  type ArchiveDocument,
  type DocumentCategory,
} from '../data/archive';
import { CrownMark, MascotAvatar } from './CrownMark';
import { AnchorButton, Button, ClayCard } from './ui/primitives';

const STORAGE_KEY = 'toxicology_archive_docs_v1';

const CATEGORIES: ('All' | DocumentCategory)[] = [
  'All',
  'Checklists',
  'Breakdowns',
  'Research Notes',
  'Saved Files',
];

interface ArchiveVaultSectionProps {
  onJumpToTarget: (targetId: string) => void;
}

export function ArchiveVaultSection({
  onJumpToTarget,
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
      // Ignore storage quota errors
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
  };

  const handleDeleteCustomDoc = (id: string) => {
    setCustomDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocId === id) {
      setSelectedDocId('doc-3step-filter');
    }
  };

  return (
    <ClayCard id="archive-vault" className="scroll-mt-24 p-5 sm:p-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 border-b-[1.5px] border-[#2A2A2A] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6B63]">
            <CrownMark className="h-4 w-4 shrink-0" />
            <span>PERMANENT REFERENCE REPOSITORY</span>
          </div>
          <h2 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight text-white">
            Document &amp; File Archive
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#A3A3A3]">
            Keep every checklist, research note, and downloadable file referenced
            from{' '}
            <span className="font-mono text-[#FF6B63]">{X_PROFILE.handle}</span>
            —each with a direct link and tweet draft.
          </p>
        </div>

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
              <FilePlus2 className="h-4 w-4 text-[#FF6B63]" />
              Add File or Brief
            </>
          )}
        </Button>
      </div>

      {/* Add File / Document Form Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleCreateDocument}
          className="mt-6 space-y-4 rounded-[20px] border-[1.5px] border-[#E10000]/50 bg-[#050505] p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-white">
              Save New Document or File to Archive
            </h3>
            <span className="text-xs text-[#A3A3A3]">
              Saved locally in browser storage
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="doc-title-input"
                className="block text-xs font-semibold text-[#F2F2F2]"
              >
                Document Title
              </label>
              <input
                id="doc-title-input"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Base L2 Fee Economics Checklist"
                className="mt-2 min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="doc-category-select"
                className="block text-xs font-semibold text-[#F2F2F2]"
              >
                Category
              </label>
              <select
                id="doc-category-select"
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as DocumentCategory)
                }
                className="mt-2 min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white focus:border-[#E10000] focus:outline-none"
              >
                <option value="Saved Files">Saved Files</option>
                <option value="Checklists">Checklists</option>
                <option value="Breakdowns">Breakdowns</option>
                <option value="Research Notes">Research Notes</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="doc-summary-input"
              className="block text-xs font-semibold text-[#F2F2F2]"
            >
              One-Line Summary
            </label>
            <input
              id="doc-summary-input"
              type="text"
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Concise summary for visitors clicking through from X..."
              className="mt-2 min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="doc-content-input"
                className="block text-xs font-semibold text-[#F2F2F2]"
              >
                Document Notes / Markdown Brief
              </label>
              <textarea
                id="doc-content-input"
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste your clean checklist, bullet points, or research notes..."
                className="mt-2 w-full rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-4 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div>
                <label
                  htmlFor="doc-tweet-input"
                  className="block text-xs font-semibold text-[#F2F2F2]"
                >
                  X Post / Tweet Draft (Optional)
                </label>
                <textarea
                  id="doc-tweet-input"
                  rows={2}
                  value={newTweetDraft}
                  onChange={(e) => setNewTweetDraft(e.target.value)}
                  placeholder="Write the X hook you'll pair with this document's link..."
                  className="mt-2 w-full rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-3.5 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
                />
              </div>

              <div className="flex min-h-[48px] flex-wrap items-center justify-between gap-2 rounded-full border-[1.5px] border-dashed border-[#2A2A2A] bg-[#161616] px-4 py-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#FF6B63] hover:text-white">
                  <Paperclip className="h-4 w-4" />
                  <span>
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
                    className="min-h-[36px] cursor-pointer px-2 text-xs text-[#A3A3A3] hover:text-white"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs font-semibold text-[#FF6B63]" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="subtle"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save to Archive
            </Button>
          </div>
        </form>
      )}

      {/* Filter & Search Toolbar */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                className={`min-h-[44px] cursor-pointer rounded-full border-[1.5px] px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#E10000] bg-[#E10000] text-white shadow-[0_0_16px_rgba(225,0,0,0.3)]'
                    : 'border-[#2A2A2A] bg-[#161616] text-[#A3A3A3] hover:border-[#E10000]/60 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents or files..."
            aria-label="Search archive documents"
            className="min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#050505] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
          />
        </div>
      </div>

      {/* Mascot 404 / Missing Hash Recovery State */}
      {missingDocHash && (
        <div
          role="alert"
          className="mt-6 flex flex-col items-center gap-4 rounded-[20px] border-[1.5px] border-[#E10000] bg-[#050505] p-6 text-center sm:flex-row sm:text-left"
        >
          <MascotAvatar size="md" />
          <div className="flex-1">
            <p className="text-xs font-bold text-[#FF6B63]">404 · DOCUMENT NOT FOUND</p>
            <h3 className="mt-1 font-display text-lg font-bold text-white">
              We couldn&apos;t find &ldquo;{missingDocHash}&rdquo; in this archive.
            </h3>
            <p className="mt-1 text-sm text-[#A3A3A3]">
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
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List */}
        <div className="space-y-3 lg:col-span-5">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] p-8 text-center">
              <MascotAvatar size="md" />
              <p className="mt-4 font-display text-base font-bold text-white">
                No documents match that filter
              </p>
              <p className="mt-1 text-sm text-[#A3A3A3]">
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
                  className={`min-h-[44px] w-full cursor-pointer rounded-[20px] border-[1.5px] p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
                    isSelected
                      ? 'border-[#E10000] bg-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(225,0,0,0.2)]'
                      : 'border-[#2A2A2A] bg-[#050505] hover:border-[#E10000]/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A3A3A3]">
                    <span>
                      <strong className="text-[#FF6B63]">{doc.code}</strong> ·{' '}
                      {doc.category} · {doc.publishedAt}
                    </span>
                    <span className="font-semibold text-white">
                      {doc.readTime}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-base font-bold text-white">
                    {doc.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#A3A3A3]">
                    {doc.summary}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right Document Reader & Share Actions */}
        {activeDoc && (
          <div className="flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b-[1.5px] border-[#2A2A2A] pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#FF6B63]">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>
                      {activeDoc.code} · {activeDoc.category} ·{' '}
                      {activeDoc.fileName}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-xl font-bold text-white">
                    {activeDoc.title}
                  </h3>
                </div>

                {activeDoc.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomDoc(activeDoc.id)}
                    aria-label="Remove saved document"
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[#2A2A2A] px-3.5 py-2 text-xs font-semibold text-[#A3A3A3] transition-colors hover:border-[#E10000] hover:text-[#FF6B63]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>

              <pre className="mt-4 max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#0E0E0E] p-4 font-sans text-sm leading-relaxed text-[#F2F2F2]">
                {activeDoc.content}
              </pre>
            </div>

            {/* Share & Download Toolbar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-[#2A2A2A] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="subtle"
                  compact
                  onClick={() => handleDownloadDoc(activeDoc)}
                >
                  <Download className="h-4 w-4 text-[#FF6B63]" />
                  Download File
                </Button>

                {activeDoc.interactiveTargetId && (
                  <Button
                    variant="subtle"
                    compact
                    onClick={() => onJumpToTarget(activeDoc.interactiveTargetId!)}
                  >
                    <PlayCircle className="h-4 w-4 text-[#FF6B63]" />
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
                      <Check className="h-4 w-4 text-[#FF6B63]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>

                <AnchorButton
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                    activeDoc.tweetDraft
                  )}&url=${encodeURIComponent(getDocShareUrl(activeDoc.id))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                >
                  Tweet Brief
                  <ExternalLink className="h-4 w-4" />
                </AnchorButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClayCard>
  );
}
