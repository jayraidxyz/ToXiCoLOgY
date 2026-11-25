import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Download, Send } from 'lucide-react';
import { PARTNERSHIP_FORMATS, X_PROFILE } from '../data/archive';
import { CrownMark } from './CrownMark';
import { AnchorButton, Button, ClayCard } from './ui/primitives';

interface SavedInquiry {
  id: string;
  project: string;
  contact: string;
  format: string;
  notes: string;
  createdAt: string;
}

const INQUIRY_STORAGE_KEY = 'toxicology_partner_inquiries_v1';

export function MethodologyPartnerSection() {
  const [project, setProject] = useState('');
  const [contact, setContact] = useState('');
  const [formatId, setFormatId] = useState(PARTNERSHIP_FORMATS[0].id);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<SavedInquiry | null>(null);
  const [copiedDm, setCopiedDm] = useState(false);

  const selectedFormat =
    PARTNERSHIP_FORMATS.find((f) => f.id === formatId) ??
    PARTNERSHIP_FORMATS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim() || !contact.trim() || !notes.trim()) {
      setError('Please complete project name, contact handle/email, and brief.');
      return;
    }

    const inquiry: SavedInquiry = {
      id: `inq-${Date.now().toString(36)}`,
      project: project.trim(),
      contact: contact.trim(),
      format: selectedFormat.title,
      notes: notes.trim(),
      createdAt: new Date().toLocaleDateString(),
    };

    try {
      const existingRaw = window.localStorage.getItem(INQUIRY_STORAGE_KEY);
      const existing = existingRaw
        ? (JSON.parse(existingRaw) as SavedInquiry[])
        : [];
      window.localStorage.setItem(
        INQUIRY_STORAGE_KEY,
        JSON.stringify([inquiry, ...existing])
      );
    } catch {
      // Ignore storage error cleanly
    }

    setError('');
    setSubmitted(inquiry);
  };

  const handleCopyBrief = async () => {
    if (!submitted) return;
    const text = `Toxicology Archive Sponsorship Inquiry\nProject: ${submitted.project}\nContact: ${submitted.contact}\nFormat: ${submitted.format}\nBrief: ${submitted.notes}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDm(true);
      setTimeout(() => setCopiedDm(false), 2200);
    } catch {
      setCopiedDm(false);
    }
  };

  const handleDownloadMediaKit = () => {
    const content = [
      `# TOXICOLOGY ARCHIVE — PARTNER & MEDIA BRIEF`,
      `Account: ${X_PROFILE.handle} (${X_PROFILE.xUrl})`,
      `Telegram: ${X_PROFILE.telegramUrl}`,
      '',
      `## POSITIONING`,
      `Signal, not noise. High-clarity Web3 research threads, due-diligence checklists, and interactive 9:16 visual breakdowns.`,
      '',
      `## SPONSORSHIP FORMATS`,
      ...PARTNERSHIP_FORMATS.map(
        (f) =>
          `### ${f.number}. ${f.title}\n- Deliverable: ${f.deliverable}\n- Turnaround: ${f.turnaround}\n- Standard: ${f.disclosure}\n`
      ),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'toxicology-archive-media-brief.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Signal, Not Noise Curation Methodology (Zero lime-green!) */}
      <ClayCard
        id="signal-methodology"
        className="scroll-mt-24 flex flex-col justify-between p-5 sm:p-8 lg:col-span-5"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6B63]">
            <CrownMark className="h-4 w-4 shrink-0" />
            <span>HOW IT WORKS</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{X_PROFILE.handle}</span>
          </div>
          <h2 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight text-white">
            Signal, Not Noise
          </h2>
          <p className="mt-2 text-base leading-relaxed text-[#A3A3A3]">
            Every thread on X links back to a permanent checklist or visual
            breakdown here so followers can verify claims straight away.
          </p>

          {/* Clean Red-on-Black Methodology Diagram */}
          <div className="mt-6 space-y-3">
            <div className="rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-bold text-white">
                  I find
                </span>
                <span className="font-display text-lg font-bold text-[#E10000]">
                  01
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[#A3A3A3]">
                The good posts, primary docs, and real fee metrics across Web3
                &amp; crypto.
              </p>
            </div>

            <div className="flex justify-center" aria-hidden="true">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E10000]/50 bg-[#E10000]/15 text-[#FF6B63]">
                <ArrowRight className="h-4 w-4 rotate-90" />
              </div>
            </div>

            <div className="rounded-[20px] border-[1.5px] border-[#E10000]/60 bg-[#161616] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(225,0,0,0.16)]">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-bold text-white">
                  I repost &amp; archive
                </span>
                <span className="font-display text-lg font-bold text-[#FF6B63]">
                  02
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[#F2F2F2]">
                The best ones land in your feed—backed by saved checklists you
                can check anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t-[1.5px] border-[#2A2A2A] pt-4 text-xs text-[#A3A3A3]">
          <CrownMark className="h-4 w-4 shrink-0" />
          <span>
            Curated by{' '}
            <span className="font-mono text-[#FF6B63]">{X_PROFILE.handle}</span>
          </span>
        </div>
      </ClayCard>

      {/* Right: Monetization & Sponsored Research Partnerships */}
      <ClayCard
        id="partner-hub"
        className="scroll-mt-24 p-5 sm:p-8 lg:col-span-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-[1.5px] border-[#2A2A2A] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6B63]">
              <CrownMark className="h-4 w-4 shrink-0" />
              <span>SPONSORSHIPS &amp; RESEARCH PARTNERSHIPS</span>
            </div>
            <h2 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight text-white">
              Work With Toxicology Archive
            </h2>
          </div>

          <Button variant="secondary" onClick={handleDownloadMediaKit}>
            <Download className="h-4 w-4 text-[#FF6B63]" />
            Download Media Brief
          </Button>
        </div>

        {/* Partnership Deliverables */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PARTNERSHIP_FORMATS.map((fmt) => (
            <div
              key={fmt.id}
              className="flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <div>
                <span className="font-display text-xl font-bold text-[#E10000]">
                  {fmt.number}
                </span>
                <h3 className="mt-2 font-display text-sm font-bold leading-snug text-white">
                  {fmt.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#A3A3A3]">
                  {fmt.deliverable}
                </p>
              </div>
              <p className="mt-3 border-t border-[#2A2A2A] pt-2.5 text-xs font-semibold text-[#F2F2F2]">
                {fmt.turnaround}
              </p>
            </div>
          ))}
        </div>

        {/* Validated Partner Inquiry Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-white">
              Request a Sponsored Breakdown
            </h3>
            <span className="text-xs text-[#A3A3A3]">
              Sponsored posts carry clear disclosure
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="partner-project"
                className="block text-xs font-semibold text-[#F2F2F2]"
              >
                Protocol or Brand Name
              </label>
              <input
                id="partner-project"
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Acme Rollup / Wallet"
                className="mt-2 min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="partner-contact"
                className="block text-xs font-semibold text-[#F2F2F2]"
              >
                X Handle, Telegram, or Email
              </label>
              <input
                id="partner-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. @handle or team@protocol.xyz"
                className="mt-2 min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="partner-format"
                className="block text-xs font-semibold text-[#F2F2F2]"
              >
                Preferred Format
              </label>
              <select
                id="partner-format"
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white focus:border-[#E10000] focus:outline-none"
              >
                {PARTNERSHIP_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.number}. {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="partner-notes"
                className="block text-xs font-semibold text-[#F2F2F2]"
              >
                Campaign Goal &amp; Docs Link
              </label>
              <input
                id="partner-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Product launch, docs URL, target window..."
                className="mt-2 min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white placeholder:text-[#A3A3A3] focus:border-[#E10000] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-[#FF6B63]" role="alert">
              {error}
            </p>
          )}

          {submitted && (
            <div className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-[#E10000] bg-[#161616] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white">
                Inquiry prepared for <strong>{submitted.project}</strong>. Copy
                and send directly via Telegram or X DM.
              </p>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="subtle"
                  compact
                  onClick={handleCopyBrief}
                >
                  {copiedDm ? (
                    <>
                      <Check className="h-4 w-4 text-[#FF6B63]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Brief
                    </>
                  )}
                </Button>
                <AnchorButton
                  href={X_PROFILE.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  compact
                >
                  <Send className="h-4 w-4" />
                  Open Telegram
                </AnchorButton>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a
              href={X_PROFILE.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs font-medium text-[#A3A3A3] underline decoration-[#2A2A2A] underline-offset-4 transition-colors hover:text-[#FF6B63]"
            >
              DM {X_PROFILE.telegramLabel}
            </a>

            <Button type="submit" variant="primary">
              Prepare Partnership Brief
            </Button>
          </div>
        </form>
      </ClayCard>
    </div>
  );
}
