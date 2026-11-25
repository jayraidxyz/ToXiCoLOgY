import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import {
  FEATURED_THREAD_TWEET,
  WEB3_FILTER_STEPS,
  X_PROFILE,
} from '../data/archive';
import { CrownMark } from './CrownMark';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';

type StepStatus = 'unreviewed' | 'pass' | 'flag';

export function Web3FilterSection() {
  const [projectName, setProjectName] = useState('');
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({
    '01': 'unreviewed',
    '02': 'unreviewed',
    '03': 'unreviewed',
  });
  const [notes, setNotes] = useState<Record<string, string>>({
    '01': '',
    '02': '',
    '03': '',
  });
  const [copiedTweet, setCopiedTweet] = useState(false);

  const summary = useMemo(() => {
    const vals = Object.values(statuses);
    const passes = vals.filter((v) => v === 'pass').length;
    const flags = vals.filter((v) => v === 'flag').length;
    if (flags > 0) {
      return {
        label: `${flags} Red Flag${flags > 1 ? 's' : ''} Detected`,
        tone: 'text-[#FF6B63]',
        detail: 'Pause before allocating capital or amplifying this narrative.',
      };
    }
    if (passes === 3) {
      return {
        label: '3/3 Checks Passed',
        tone: 'text-white',
        detail: 'Incentives, stress resilience, and real usage verified.',
      };
    }
    return {
      label: `${passes}/3 Reviewed`,
      tone: 'text-[#F2F2F2]',
      detail: 'Score each step below to generate a shareable due-diligence brief.',
    };
  }, [statuses]);

  const currentUrl =
    typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

  const shareText = projectName.trim()
    ? `Ran ${projectName.trim()} through the @toxicologyavp 3-Step Web3 Filter (${summary.label}).\n\nCheck incentives, stress failure modes, and real usage before aping:`
    : FEATURED_THREAD_TWEET;

  const xIntentHref = `https://x.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(currentUrl)}`;

  const handleCopyTweet = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${currentUrl}`);
      setCopiedTweet(true);
      setTimeout(() => setCopiedTweet(false), 2200);
    } catch {
      setCopiedTweet(false);
    }
  };

  const handleDownloadBrief = () => {
    const subject = projectName.trim() || 'Untitled Web3 Project';
    const mdLines = [
      `# THE 3-STEP WEB3 FILTER — ${subject}`,
      `Source: Toxicology Archive (${X_PROFILE.handle}) · ${X_PROFILE.telegramLabel}`,
      `Verdict: ${summary.label}`,
      '',
      ...WEB3_FILTER_STEPS.map((step) => {
        const st = statuses[step.number].toUpperCase();
        const note = notes[step.number]?.trim() || 'No notes recorded.';
        return [
          `## ${step.number}. ${step.question}`,
          `- Status: ${st}`,
          `- Guidance: ${step.guidance}`,
          `- Reviewer Note: ${note}`,
          '',
        ].join('\n');
      }),
    ].join('\n');

    const blob = new Blob([mdLines], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web3-filter-${subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setProjectName('');
    setStatuses({ '01': 'unreviewed', '02': 'unreviewed', '03': 'unreviewed' });
    setNotes({ '01': '', '02': '', '03': '' });
  };

  return (
    <Card id="three-step-filter" className="scroll-mt-24 p-4 sm:p-8">
      <div className="flex flex-col gap-4 border-b-[1.5px] border-[#2A2A2A] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#FF6B63]">
            <CrownMark className="h-4 w-4 shrink-0" />
            <span>FEATURED THREAD CHECKLIST</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{X_PROFILE.handle}</span>
          </div>
          <h2 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight text-white">
            The 3-Step Web3 Filter
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#A3A3A3]">
            Most Web3 news tries to sound complicated so you don&apos;t notice
            nothing happened. Run any token or protocol through these three
            checks before you ape or share.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleCopyTweet}>
            {copiedTweet ? (
              <>
                <Check className="h-4 w-4 text-[#FF6B63]" />
                Copied Thread
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Tweet + Link
              </>
            )}
          </Button>

          <Button asChild variant="primary">
            <a href={xIntentHref} target="_blank" rel="noopener noreferrer">
              Share on X
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Interactive Project Target + Verdict Strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] p-4 sm:p-5 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <label
            htmlFor="filter-project-input"
            className="block text-xs font-semibold text-[#A3A3A3]"
          >
            Project or Token Under Review (Optional)
          </label>
          <Input
            id="filter-project-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Protocol X, $TOKEN, New L2..."
            className="mt-2"
          />
        </div>

        <div className="flex flex-col justify-center lg:col-span-4">
          <span className="text-xs font-semibold text-[#A3A3A3]">
            Verification Status
          </span>
          <span className={`mt-1 font-display text-xl font-bold ${summary.tone}`}>
            {summary.label}
          </span>
          <span className="text-xs text-[#A3A3A3]">{summary.detail}</span>
        </div>

        <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
          <Button variant="subtle" size="compact" onClick={handleDownloadBrief}>
            <Download className="h-4 w-4 text-[#FF6B63]" />
            Save Brief (.md)
          </Button>
          <Button
            variant="subtle"
            size="compact"
            onClick={handleReset}
            aria-label="Reset filter checklist"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Big 3-Step Clay Cards with Red 01 / 02 / 03 Numerals */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {WEB3_FILTER_STEPS.map((step) => {
          const currentStatus = statuses[step.number];
          return (
            <Card
              key={step.number}
              interactive
              className={`flex min-w-0 flex-col justify-between p-4 sm:p-6 ${
                currentStatus === 'pass'
                  ? 'border-white/50 bg-[#161616]'
                  : currentStatus === 'flag'
                  ? 'border-[#E10000] bg-[#161616] shadow-[0_0_24px_rgba(225,0,0,0.22)]'
                  : ''
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-[36px] font-bold leading-none tabular-nums text-[#E10000] drop-shadow-[0_0_16px_rgba(225,0,0,0.4)] sm:text-[40px]">
                    {step.number}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setStatuses((prev) => ({
                          ...prev,
                          [step.number]:
                            prev[step.number] === 'pass' ? 'unreviewed' : 'pass',
                        }))
                      }
                      aria-pressed={currentStatus === 'pass'}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
                        currentStatus === 'pass'
                          ? 'border-white bg-white text-[#050505]'
                          : 'border-[#2A2A2A] bg-[#161616] text-white hover:border-white/60'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setStatuses((prev) => ({
                          ...prev,
                          [step.number]:
                            prev[step.number] === 'flag' ? 'unreviewed' : 'flag',
                        }))
                      }
                      aria-pressed={currentStatus === 'flag'}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
                        currentStatus === 'flag'
                          ? 'border-[#E10000] bg-[#E10000] text-white'
                          : 'border-[#2A2A2A] bg-[#161616] text-white hover:border-[#E10000]/70'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Flag
                    </button>
                  </div>
                </div>

                <h3 className="mt-4 font-display text-xl font-bold leading-snug text-white">
                  {step.question}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#A3A3A3]">
                  {step.guidance}
                </p>

                <div className="mt-4 space-y-2 border-t-[1.5px] border-[#2A2A2A] pt-4 text-xs leading-relaxed">
                  <p className="text-[#A3A3A3]">
                    <span className="font-semibold text-white">Pass: </span>
                    {step.passSignal}
                  </p>
                  <p className="text-[#A3A3A3]">
                    <span className="font-semibold text-[#FF6B63]">Flag: </span>
                    {step.redFlag}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Input
                  value={notes[step.number]}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [step.number]: e.target.value,
                    }))
                  }
                  placeholder="Add verification note..."
                  aria-label={`Verification note for step ${step.number}`}
                  className="bg-[#050505] text-xs"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
