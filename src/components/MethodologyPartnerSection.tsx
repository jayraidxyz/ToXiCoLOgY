import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Download, Layers, Send } from 'lucide-react';
import { PARTNERSHIP_FORMATS, X_PROFILE } from '../data/archive';
import { CrownMark } from './CrownMark';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Left: Signal, Not Noise Curation Methodology */}
      <Card
        id="signal-methodology"
        className="scroll-mt-28 flex flex-col justify-between p-4 sm:p-6 lg:col-span-5"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
            HOW IT WORKS ·{' '}
            <span className="font-mono text-[var(--accent-text)]">
              {X_PROFILE.handle}
            </span>
          </p>
          <h2 className="heading-section mt-1.5 font-display font-bold tracking-tight text-[var(--text)]">
            Signal, Not Noise
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            Every thread on X links back to a permanent checklist or visual
            breakdown here so followers can verify claims straight away.
          </p>

          {/* Clean Methodology Cards */}
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 font-display text-xs font-bold tabular-nums text-[var(--accent-text)]">
                  Phase 01
                </span>
                <span className="font-display text-base font-bold text-[var(--text)]">
                  I find
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                The good posts, primary docs, and real fee metrics across Web3
                &amp; crypto.
              </p>
            </div>

            <div className="flex justify-center" aria-hidden="true">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent-text)]">
                <ArrowRight className="h-4 w-4 rotate-90" />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--accent)] bg-[var(--surface-2)] p-4 shadow-[0_0_20px_var(--accent-glow)]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-md border border-[var(--accent)]/40 bg-[var(--bg)] px-2 py-0.5 font-display text-xs font-bold tabular-nums text-[var(--accent-text)]">
                  Phase 02
                </span>
                <span className="font-display text-base font-bold text-[var(--text)]">
                  I repost &amp; archive
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--text)]">
                The best ones land in your feed—backed by saved checklists you
                can check anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          <CrownMark className="h-4 w-4 shrink-0" />
          <span>
            Curated by{' '}
            <span className="font-mono text-[var(--accent-text)]">
              {X_PROFILE.handle}
            </span>
          </span>
        </div>
      </Card>

      {/* Right: Monetization & Sponsored Research Partnerships */}
      <Card
        id="partner-hub"
        className="scroll-mt-28 p-4 sm:p-6 lg:col-span-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
              SPONSORSHIPS &amp; RESEARCH PARTNERSHIPS
            </p>
            <h2 className="heading-section mt-1.5 font-display font-bold tracking-tight text-[var(--text)]">
              Work With Toxicology Archive
            </h2>
          </div>

          <Button variant="secondary" onClick={handleDownloadMediaKit}>
            <Download className="h-4 w-4 text-[var(--accent-text)]" />
            Download Media Brief
          </Button>
        </div>

        {/* Partnership Formats: grid-cols-2 on mobile (last odd card sits naturally in own row), md:grid-cols-3 */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {PARTNERSHIP_FORMATS.map((fmt) => {
            const active = formatId === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setFormatId(fmt.id)}
                className={`flex min-w-0 cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:p-4 ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-[0_0_18px_var(--accent-glow)]'
                    : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-display text-xs font-bold tabular-nums text-[var(--accent-text)]">
                      Format {fmt.number}
                    </span>
                    <Layers
                      className="h-4 w-4 shrink-0 text-[var(--muted)]"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-2.5 font-display text-sm font-bold leading-snug text-[var(--text)]">
                    {fmt.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[var(--muted)]">
                    {fmt.deliverable}
                  </p>
                </div>
                <p className="mt-3 border-t border-[var(--border)] pt-2 text-xs font-semibold text-[var(--text)]">
                  {fmt.turnaround}
                </p>
              </button>
            );
          })}
        </div>

        {/* Validated Partner Inquiry Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-[var(--text)]">
              Request a Sponsored Breakdown
            </h3>
            <span className="text-xs text-[var(--muted)]">
              Sponsored posts carry clear disclosure
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0">
              <label
                htmlFor="partner-project"
                className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
              >
                Protocol or Brand Name
              </label>
              <Input
                id="partner-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Acme Rollup / Wallet"
                className="mt-2"
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="partner-contact"
                className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
              >
                Handle, TG, or Email
              </label>
              <Input
                id="partner-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="@handle or team@protocol.xyz"
                className="mt-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0">
              <label
                htmlFor="partner-format"
                className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
              >
                Preferred Format
              </label>
              <select
                id="partner-format"
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-base text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]/60"
              >
                {PARTNERSHIP_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.number}. {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="partner-notes"
                className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
              >
                Campaign Goal &amp; Docs URL
              </label>
              <Input
                id="partner-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="https://docs... / Launch window"
                className="mt-2 font-mono"
              />
            </div>
          </div>

          {error && (
            <p
              className="text-xs font-semibold text-[var(--accent-text)]"
              role="alert"
            >
              {error}
            </p>
          )}

          {submitted && (
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--accent)] bg-[var(--surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--text)]">
                Inquiry prepared for <strong>{submitted.project}</strong>. Copy
                and send directly via Telegram or X DM.
              </p>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button variant="subtle" size="compact" onClick={handleCopyBrief}>
                  {copiedDm ? (
                    <>
                      <Check className="h-4 w-4 text-[var(--accent-text)]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Brief
                    </>
                  )}
                </Button>
                <Button asChild variant="primary" size="compact">
                  <a
                    href={X_PROFILE.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Send className="h-4 w-4" />
                    Open Telegram
                  </a>
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a
              href={X_PROFILE.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center font-mono text-xs font-medium text-[var(--muted)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:text-[var(--accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
            >
              DM {X_PROFILE.telegramLabel}
            </a>

            <Button type="submit" variant="primary">
              Prepare Partnership Brief
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
