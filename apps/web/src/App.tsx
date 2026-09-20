import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertCircle, ArrowRight, BarChart3, BookOpen, Check, ChevronDown, ChevronRight,
  ClipboardCheck, Clock3, Database, FileText, Filter, FlaskConical, Gauge, Info,
  LockKeyhole, Menu, Network, Plus, Search, Settings2, ShieldCheck, Sparkles, Target,
  Trash2, Upload, UserRound, UsersRound, X, Zap
} from 'lucide-react';
import {
  useHealthCheck, useGetDashboard, useListJobs, useCreateJob, useGetJob, useUpdateJob,
  useDeleteJob, useRunScreening, useListScreenings, useListCandidates,
  useGetCandidate, useUpdateCandidateStatus, useExplainCandidate, useGetFairness,
  useGetModelMetrics, getGetDashboardQueryKey, getListJobsQueryKey, getListScreeningsQueryKey,
  getListCandidatesQueryKey, getGetCandidateQueryKey, getGetJobQueryKey
} from '@workspace/api-client-react';
import type { Candidate, Job, JobInput, ResumeInput } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScoreDistributionChart } from '@/components/score-distribution-chart';
import { extractResumeText } from '@/lib/resume-text';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';

const queryClient = new QueryClient();

const navSections = [
  { label: 'Workspace', items: [
    { href: '/dashboard', label: 'Overview', icon: Gauge },
    { href: '/screening', label: 'Screening lab', icon: FlaskConical },
    { href: '/candidates', label: 'Candidates', icon: UsersRound },
    { href: '/results', label: 'Results', icon: ClipboardCheck },
  ]},
  { label: 'Evidence', items: [
    { href: '/job-description', label: 'Job descriptions', icon: FileText },
    { href: '/explainability', label: 'Explainability', icon: Network },
    { href: '/fairness', label: 'Fairness assessment', icon: ShieldCheck },
    { href: '/model', label: 'Model performance', icon: BarChart3 },
  ]},
];

function IntegrityBanner() {
  return <div className="border-b hairline bg-[hsl(var(--accent)/.15)] px-4 py-2 text-[11px] text-[hsl(var(--foreground)/.78)] sm:px-6">
    <div className="mx-auto flex max-w-[1600px] items-center gap-2">
      <LockKeyhole className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
      <span><strong className="font-semibold text-[hsl(var(--foreground))]">Prototype Demonstration</strong><span className="mx-2 opacity-40">/</span>AI-assisted decision support — final recruitment decisions remain with the recruiter.</span>
      <span className="mono ml-auto hidden text-[10px] uppercase tracking-widest text-[hsl(var(--primary))] sm:inline">DEMO_MODE</span>
    </div>
  </div>;
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const health = useHealthCheck();
  return <aside className="flex h-full w-[258px] shrink-0 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
    <div className="flex items-center justify-between px-6 pb-7 pt-7">
      <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-sm bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><Sparkles className="h-4 w-4" /></span>
        <span><span className="serif block text-[17px] leading-none tracking-tight">Resume / AI</span><span className="mono mt-1 block text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.55)]">Research instrument</span></span>
      </Link>
      {onClose && <button onClick={onClose} className="rounded p-1 text-[hsl(var(--sidebar-foreground)/.7)] md:hidden" aria-label="Close navigation" data-testid="button-close-navigation"><X className="h-5 w-5" /></button>}
    </div>
    <div className="px-4">
      <div className="mb-7 rounded-md border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] px-3 py-3">
        <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${health.isError ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--sidebar-primary))]'}`} /><span className="mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.7)]">{health.isError ? 'API offline' : 'System online'}</span></div>
        <div className="mt-2 text-[11px] leading-4 text-[hsl(var(--sidebar-foreground)/.55)]">{health.isLoading ? 'Checking service endpoint…' : health.isError ? 'Using local demonstration state' : 'Research API connected'}</div>
      </div>
      {navSections.map(section => <div key={section.label} className="mb-7">
        <div className="mono mb-2 px-3 text-[9px] uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.4)]">{section.label}</div>
        <nav className="space-y-0.5">
          {section.items.map(item => { const active = location === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onClose} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors ${active ? 'bg-[hsl(var(--sidebar-primary)/.16)] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.63)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}><Icon className="h-4 w-4" /><span>{item.label}</span>{active && <ChevronRight className="ml-auto h-3.5 w-3.5" />}</Link>; })}
        </nav>
      </div>)}
    </div>
    <div className="mt-auto border-t border-[hsl(var(--sidebar-border))] p-4">
      <Link href="/about" onClick={onClose} data-testid="link-nav-about" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[hsl(var(--sidebar-foreground)/.63)] hover:bg-[hsl(var(--sidebar-accent))]"><BookOpen className="h-4 w-4" />About the study</Link>
      <div className="mt-4 flex items-center gap-3 px-3"><div className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-semibold text-[hsl(var(--accent-foreground))]">DR</div><div><div className="text-xs font-medium">Demo recruiter</div><div className="mono text-[9px] text-[hsl(var(--sidebar-foreground)/.45)]">RESEARCH ACCESS</div></div><Settings2 className="ml-auto h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground)/.4)]" /></div>
    </div>
  </aside>;
}

function Shell({ children }: { children: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  return <div className="instrument-shell noise">
    <IntegrityBanner />
    <div className="flex min-h-[calc(100dvh-33px)]">
      <div className="hidden md:block"><Sidebar /></div>
      {mobileNav && <div className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/.35)] md:hidden" onClick={() => setMobileNav(false)}><div className="h-full w-[280px]" onClick={e => e.stopPropagation()}><Sidebar onClose={() => setMobileNav(false)} /></div></div>}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between border-b hairline bg-[hsl(var(--background)/.9)] px-4 backdrop-blur-md sm:px-7">
          <button onClick={() => setMobileNav(true)} className="rounded-md p-2 hover:bg-[hsl(var(--muted))] md:hidden" aria-label="Open navigation" data-testid="button-open-navigation"><Menu className="h-5 w-5" /></button>
          <div className="mono hidden text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))] md:block">Candidate evidence workspace <span className="mx-2 text-[hsl(var(--accent))]">•</span> v0.1 dissertation prototype</div>
          <div className="ml-auto flex items-center gap-2"><Link href="/about" data-testid="link-header-about" className="hidden rounded-md px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] sm:block">Research notes</Link><Link href="/login" data-testid="link-header-login" className="flex items-center gap-2 rounded-md border hairline bg-[hsl(var(--card))] px-3 py-2 text-xs font-medium hover:bg-[hsl(var(--muted))]"><UserRound className="h-3.5 w-3.5" /> Demo entry</Link></div>
        </header>
        <div className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-9">{children}</div>
      </main>
    </div>
  </div>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 border-b hairline pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="mono mb-3 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="serif text-3xl tracking-tight text-[hsl(var(--foreground))] sm:text-[38px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</div>;
}

function Card({ children, className = '', testId }: { children: ReactNode; className?: string; testId?: string }) { return <section data-testid={testId} className={`rounded-lg border hairline bg-[hsl(var(--card))] shadow-[0_1px_2px_hsl(var(--foreground)/.03)] ${className}`}>{children}</section>; }
function SectionLabel({ children }: { children: ReactNode }) { return <div className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">{children}</div>; }
function Button({ children, onClick, href, variant = 'primary', disabled, testId, type = 'button' }: { children: ReactNode; onClick?: () => void; href?: string; variant?: 'primary'|'outline'|'ghost'|'danger'; disabled?: boolean; testId: string; type?: 'button'|'submit' }) {
  const cls = `inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3.5 text-xs font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 ${variant === 'primary' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:translate-y-[-1px] hover:shadow-md' : variant === 'danger' ? 'border border-[hsl(var(--destructive)/.4)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]' : variant === 'outline' ? 'border hairline bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`;
  if (href) return <Link href={href} data-testid={testId} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={cls}>{children}</button>;
}
function QueryMessage({ loading, error, empty, onRetry, children }: { loading?: boolean; error?: boolean; empty?: boolean; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <div className="space-y-3 py-5" data-testid="state-loading"><div className="h-4 w-1/3 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="h-10 w-full animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="h-10 w-4/5 animate-pulse rounded bg-[hsl(var(--muted))]" /></div>;
  if (error) return <div className="flex items-center gap-3 rounded-md border border-[hsl(var(--destructive)/.28)] bg-[hsl(var(--destructive)/.06)] p-4 text-sm text-[hsl(var(--destructive))]" data-testid="state-error"><AlertCircle className="h-4 w-4 shrink-0" /><span>Unable to load this research record.</span>{onRetry && <button onClick={onRetry} className="ml-auto underline" data-testid="button-retry">Retry</button>}</div>;
  if (empty) return <div className="flex flex-col items-center justify-center px-6 py-14 text-center" data-testid="state-empty"><div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Database className="h-5 w-5" /></div><h3 className="text-sm font-semibold">No records yet</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[hsl(var(--muted-foreground))]">Run a demonstration workflow or adjust the current filter to inspect evidence.</p></div>;
  return <>{children}</>;
}
function Score({ value, size = 'md' }: { value: number; size?: 'sm'|'md'|'lg' }) { const n = Math.round(value); return <div className={`score-ring grid shrink-0 place-items-center rounded-full ${size === 'lg' ? 'h-20 w-20' : size === 'sm' ? 'h-10 w-10' : 'h-14 w-14'}`} style={{ '--score': `${Math.max(0, Math.min(100, n))}%` } as React.CSSProperties}><div className="grid h-[calc(100%-5px)] w-[calc(100%-5px)] place-items-center rounded-full"><span className={`mono font-medium ${size === 'lg' ? 'text-base' : size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>{n}</span></div></div>; }
function StatusPill({ status }: { status: string }) { const tone = status.toLowerCase().includes('short') ? 'bg-[hsl(var(--chart-3)/.14)] text-[hsl(var(--chart-3))]' : status.toLowerCase().includes('reject') ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground)/.8)]'; return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${tone}`} data-testid={`status-${status}`}>{status}</span>; }

function Home() {
  return <Shell><div className="paper-grid relative overflow-hidden rounded-xl border hairline bg-[hsl(var(--card)/.5)] px-6 py-12 sm:px-12 sm:py-20 lg:px-20"><div className="max-w-4xl fade-up"><div className="mono mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> End-to-end NLP research prototype</div><h1 className="serif max-w-4xl text-5xl leading-[.98] tracking-[-.04em] sm:text-7xl lg:text-[92px]">Inspect the signal.<br /><span className="text-[hsl(var(--primary))]">Interrogate the decision.</span></h1><p className="mt-7 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))]">A calm workspace for tracing resume evidence from semantic similarity through model scoring, explanations, and fairness checks.</p><div className="mt-9 flex flex-wrap gap-3"><Button href="/dashboard" testId="button-enter-workspace">Enter workspace <ArrowRight className="h-4 w-4" /></Button><Button href="/about" variant="outline" testId="button-read-study">Read the study context</Button></div></div><div className="mt-16 grid max-w-3xl grid-cols-2 gap-7 border-t hairline pt-6 sm:grid-cols-4 fade-up delay-2">{[['01','NLP intake'],['02','Feature geometry'],['03','Model evidence'],['04','Human review']].map(([n,l]) => <div key={n}><div className="mono text-[10px] text-[hsl(var(--accent-foreground))]">{n}</div><div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{l}</div></div>)}</div><div className="pointer-events-none absolute -right-20 -top-20 hidden h-96 w-96 rounded-full border-[42px] border-[hsl(var(--accent)/.18)] sm:block" /></div><div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Card className="p-6 sm:p-8"><SectionLabel>Research premise</SectionLabel><div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end"><p className="serif max-w-xl text-2xl leading-tight">The score is not the conclusion. It is a prompt for a better question.</p><Button href="/screening" testId="button-start-screening">Open screening lab <FlaskConical className="h-4 w-4" /></Button></div></Card><Card className="bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]"><SectionLabel>Integrity notice</SectionLabel><p className="mt-5 text-sm leading-6 opacity-80">Demonstration data and model outputs are for research inspection only. This system does not claim bias-free results or production accuracy.</p></Card></div></Shell>;
}

function DashboardPage() {
  const q = useGetDashboard();
  const d = q.data;

  return (
    <Shell>
      <PageIntro
        eyebrow="01 / overview"
        title="Research overview"
        description="A live readout of the current screening corpus and the evidence trail behind each recommendation."
        action={
          <Button href="/screening" testId="button-dashboard-screen">
            New screening <Plus className="h-4 w-4" />
          </Button>
        }
      />
      <QueryMessage loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()}>
        {d && (
          <>
            <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
              <Card className="p-5 sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <SectionLabel>Score distribution</SectionLabel>
                    <h2 className="mt-2 text-sm font-semibold">Candidate match scores</h2>
                  </div>
                  <span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">
                    n = {d.stats.screenedCandidates}
                  </span>
                </div>
                <ScoreDistributionChart points={d.scoreDistribution || []} />
              </Card>

              <Card className="p-5 sm:p-6">
                <SectionLabel>Status breakdown</SectionLabel>
                <h2 className="mt-2 text-sm font-semibold">Human review queue</h2>
                <div className="mt-6 space-y-4">
                  {(d.statusBreakdown || []).map(p => (
                    <div key={p.label}>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span>{p.label}</span>
                        <span className="mono">{p.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--accent))]"
                          style={{ width: `${Math.min(100, p.value)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
              <Card className="p-5 sm:p-6">
                <SectionLabel>Top skills in corpus</SectionLabel>
                <div className="mt-5 space-y-3">
                  {(d.topSkills || []).slice(0, 6).map((p, i) => (
                    <div className="flex items-center gap-3" key={p.label}>
                      <span className="mono w-4 text-[10px] text-[hsl(var(--muted-foreground))]">
                        0{i + 1}
                      </span>
                      <span className="flex-1 text-xs">{p.label}</span>
                      <span className="mono text-[10px] text-[hsl(var(--primary))]">
                        {p.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
              <RecentCandidates candidates={d.recentScreenings || []} />
            </div>
          </>
        )}
      </QueryMessage>
    </Shell>
  );
}

function RecentCandidates({ candidates }: { candidates: Candidate[] }) { return <Card className="p-5 sm:p-6" testId="list-recent-candidates"><div className="mb-4 flex items-center justify-between"><div><SectionLabel>Recent screening evidence</SectionLabel><h2 className="mt-2 text-sm font-semibold">Latest candidate signals</h2></div><Button href="/candidates" variant="ghost" testId="button-view-candidates">View all <ArrowRight className="h-3 w-3" /></Button></div><QueryMessage empty={!candidates.length}>{candidates.slice(0,5).map(c => <Link href={`/candidates/${c.id}`} key={c.id} data-testid={`row-recent-candidate-${c.id}`} className="flex items-center gap-3 border-t hairline py-3 hover:bg-[hsl(var(--muted)/.45)]"><div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--secondary))] text-xs font-semibold text-[hsl(var(--primary))]">{c.name.split(' ').map(x => x[0]).join('').slice(0,2)}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{c.name}</div><div className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{c.sourceFile}</div></div><Score value={c.overallScore} size="sm" /></Link>)}</QueryMessage></Card>; }

function ScreeningPage() {
  const jobs = useListJobs(); const run = useRunScreening(); const qc = useQueryClient(); const [,setLocation] = useLocation();
  const [jobId,setJobId] = useState(''); const [description,setDescription] = useState(''); const [files,setFiles] = useState<ResumeInput[]>([]); const [resultId,setResultId] = useState(''); const [fileError,setFileError] = useState(''); const [extracting,setExtracting] = useState(false);
  const addFiles = async (e: React.ChangeEvent<HTMLInputElement>) => { const selected = Array.from(e.target.files || []); e.target.value = ''; if (!selected.length) return; setFileError(''); setExtracting(true); try { const settled = await Promise.allSettled(selected.map(async f => ({ filename: f.name, text: await extractResumeText(f), fileType: f.type || 'application/octet-stream' }))); const next = settled.flatMap(item => item.status === 'fulfilled' ? [item.value] : []); const errors = settled.flatMap(item => item.status === 'rejected' ? [item.reason instanceof Error ? item.reason.message : 'A resume could not be read.'] : []); if (next.length) setFiles(v => [...v, ...next]); if (errors.length) setFileError(errors.join(' ')); } finally { setExtracting(false); } };
  const submit = () => { if (!files.length || !description.trim()) return; run.mutate({ data: { jobId: jobId || null, jobDescription: description, resumes: files } }, { onSuccess: async result => { setResultId(result.id); await Promise.all([qc.invalidateQueries({queryKey: getGetDashboardQueryKey()}), qc.invalidateQueries({queryKey: getListScreeningsQueryKey()}), qc.invalidateQueries({queryKey: getListCandidatesQueryKey()})]); setLocation('/results'); } }); };
  return <Shell><PageIntro eyebrow="02 / intake + inference" title="Screening lab" description="Assemble a job context and resume corpus, then trace the full scoring pipeline in one controlled run." action={<span className="mono rounded-full border border-[hsl(var(--accent)/.5)] bg-[hsl(var(--accent)/.12)] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--primary))]">DEMO_MODE</span>} /><div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]"><Card className="p-5 sm:p-7"><div className="mb-7 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary))] text-xs text-[hsl(var(--primary-foreground))]">01</span><div><h2 className="text-sm font-semibold">Define screening context</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">Select a saved job or provide a research prompt.</p></div></div><label className="mb-2 block text-xs font-semibold">Saved job description</label><select value={jobId} onChange={e => {setJobId(e.target.value); const j = (jobs.data || []).find(x => x.id === e.target.value); if(j) setDescription(j.description);}} data-testid="select-screening-job" className="mb-5 h-10 w-full rounded-md border hairline bg-[hsl(var(--background))] px-3 text-xs outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.4)]"><option value="">Use a custom description</option>{(jobs.data || []).map(j => <option value={j.id} key={j.id}>{j.title} · {j.department}</option>)}</select><label className="mb-2 block text-xs font-semibold">Job description <span className="font-normal text-[hsl(var(--muted-foreground))]">required</span></label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={10} placeholder="Describe the role, required evidence, and constraints…" data-testid="textarea-job-description" className="w-full resize-none rounded-md border hairline bg-[hsl(var(--background))] p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.4)]" /></Card><Card className="p-5 sm:p-7"><div className="mb-7 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary))] text-xs text-[hsl(var(--primary-foreground))]">02</span><div><h2 className="text-sm font-semibold">Load resume corpus</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">Text is extracted locally before the demonstration API scores it.</p></div></div><label htmlFor="resume-files" className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.04)] px-6 py-10 text-center hover:bg-[hsl(var(--primary)/.08)]"><Upload className="mb-3 h-6 w-6 text-[hsl(var(--primary))]" /><span className="text-sm font-semibold">{extracting ? 'Extracting resume text…' : 'Choose resume files'}</span><span className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">PDF, DOCX, or TXT · multiple allowed</span><input id="resume-files" type="file" multiple accept=".pdf,.docx,.txt" className="sr-only" onChange={addFiles} disabled={extracting} data-testid="input-resume-files" /></label>{fileError && <div className="mt-3 flex gap-2 rounded-md border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] p-3 text-xs leading-5 text-[hsl(var(--destructive))]" data-testid="text-resume-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{fileError}</div>}<div className="mt-4 space-y-2">{files.map((f,i) => <div key={`${f.filename}-${i}`} className="flex items-center gap-3 rounded-md border hairline px-3 py-2.5" data-testid={`row-upload-${i}`}><FileText className="h-4 w-4 text-[hsl(var(--primary))]" /><span className="min-w-0 flex-1 truncate text-xs">{f.filename}</span><span className="mono text-[9px] text-[hsl(var(--chart-3))]">TEXT READY</span><button onClick={() => setFiles(v => v.filter((_,x)=>x!==i))} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" aria-label={`Remove ${f.filename}`} data-testid={`button-remove-upload-${i}`}><X className="h-4 w-4" /></button></div>)}</div>{!files.length && !extracting && <div className="mt-5 text-center text-xs text-[hsl(var(--muted-foreground))]">No resumes in this run yet.</div>}<div className="mt-8 border-t hairline pt-5"><Button onClick={submit} disabled={!files.length || !description.trim() || run.isPending || extracting} testId="button-run-screening">{run.isPending ? 'Running pipeline…' : 'Run screening pipeline'} <Zap className="h-4 w-4" /></Button>{run.isError && <div className="mt-3 text-xs text-[hsl(var(--destructive))]" data-testid="text-screening-error">The run could not start. Check the job context and try again.</div>}{resultId && <div className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--chart-3))]" data-testid="status-screening-complete"><Check className="h-4 w-4" /> Run {resultId} completed. Opening results…</div>}</div></Card></div><div className="mt-5 rounded-lg border hairline bg-[hsl(var(--primary)/.06)] p-5"><div className="flex items-start gap-3"><Info className="mt-0.5 h-4 w-4 text-[hsl(var(--primary))]" /><div><SectionLabel>Pipeline trace</SectionLabel><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">NLP parsing <span className="mx-2 text-[hsl(var(--accent))]">→</span> feature engineering <span className="mx-2 text-[hsl(var(--accent))]">→</span> hashed n-gram semantic representation <span className="mx-2 text-[hsl(var(--accent))]">→</span> cosine similarity <span className="mx-2 text-[hsl(var(--accent))]">→</span> trained logistic classifier <span className="mx-2 text-[hsl(var(--accent))]">→</span> feature contribution <span className="mx-2 text-[hsl(var(--accent))]">→</span> fairness review</p></div></div></div></Shell>;
}

function CandidatesPage() {
  const [search,setSearch]=useState(''); const [status,setStatus]=useState(''); const q = useListCandidates({search: search || undefined, status: status || undefined}); const candidates=q.data || [];
  return <Shell><PageIntro eyebrow="03 / candidate corpus" title="Candidates" description="Search the evidence corpus and open a candidate record for human review." action={<div className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{candidates.length} records returned</div>} /><Card className="mb-5 p-3 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, skill, or source file" data-testid="input-search-candidates" className="h-10 w-full rounded-md border hairline bg-[hsl(var(--background))] pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.4)]" /></div><div className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><select value={status} onChange={e=>setStatus(e.target.value)} data-testid="select-candidate-status" className="h-10 w-full rounded-md border hairline bg-[hsl(var(--background))] pl-9 pr-8 text-xs sm:w-44"><option value="">All statuses</option><option value="shortlisted">Shortlisted</option><option value="review">Review</option><option value="rejected">Rejected</option></select></div></div></Card><Card><QueryMessage loading={q.isLoading} error={q.isError} empty={!q.isLoading&&!q.isError&&!candidates.length} onRetry={()=>q.refetch()}>{<div className="divide-y hairline">{candidates.map(c => <CandidateRow key={c.id} candidate={c} />)}</div>}</QueryMessage></Card></Shell>;
}
function CandidateRow({candidate:c}:{candidate:Candidate}) { return <Link href={`/candidates/${c.id}`} data-testid={`row-candidate-${c.id}`} className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-[hsl(var(--muted)/.4)] sm:flex-row sm:items-center sm:px-6"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--secondary))] text-xs font-semibold text-[hsl(var(--primary))]">{c.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div className="min-w-0"><div className="truncate text-sm font-semibold">{c.name}</div><div className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">{c.jobTitles?.[0] || c.education} · {c.experience} years experience</div></div></div><div className="flex items-center gap-5 pl-12 sm:pl-0"><div className="hidden min-w-[180px] gap-1 sm:flex">{c.matchedSkills.slice(0,3).map(s=><span key={s} className="rounded bg-[hsl(var(--muted))] px-2 py-1 text-[10px]">{s}</span>)}</div><StatusPill status={c.status} /><Score value={c.overallScore} size="sm" /></div></Link>; }

function CandidateProfilePage() {
  const {id=''}=useParams(); const q=useGetCandidate(id,{query:{queryKey:getGetCandidateQueryKey(id),enabled:!!id}}); const update=useUpdateCandidateStatus(); const qc=useQueryClient(); const c=q.data; const [notes,setNotes]=useState(''); const [noteInit,setNoteInit]=useState(false);
  if(c && !noteInit){setNotes(c.notes || ''); setNoteInit(true);}
  const patch=(status:string)=>update.mutate({id,data:{status,notes}}, {onSuccess:()=>{qc.invalidateQueries({queryKey:getGetCandidateQueryKey(id)}); qc.invalidateQueries({queryKey:getListCandidatesQueryKey()});}});
  return <Shell><div className="mb-5"><Button href="/candidates" variant="ghost" testId="button-back-candidates"><ArrowRight className="h-4 w-4 rotate-180" /> Back to candidates</Button></div><QueryMessage loading={q.isLoading} error={q.isError} onRetry={()=>q.refetch()}>{c && <><PageIntro eyebrow="candidate record" title={c.name} description={`${c.email} · ${c.phone}`} action={<div className="flex gap-2"><Button onClick={()=>patch('shortlisted')} disabled={update.isPending} testId="button-shortlist-candidate"><Check className="h-4 w-4" /> Shortlist</Button><Button onClick={()=>patch('rejected')} variant="danger" disabled={update.isPending} testId="button-reject-candidate">Reject</Button></div>} /><div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]"><div className="space-y-5"><Card className="p-5 sm:p-7"><div className="flex flex-col justify-between gap-6 sm:flex-row"><div><SectionLabel>Model evidence</SectionLabel><div className="mt-4 flex items-center gap-5"><Score value={c.overallScore} size="lg" /><div><div className="serif text-2xl">{Math.round(c.overallScore)} / 100</div><StatusPill status={c.status} /><div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Composite recommendation score</div></div></div></div><div className="grid grid-cols-2 gap-x-8 gap-y-4 text-right"><div><SectionLabel>Semantic</SectionLabel><div className="mono mt-1 text-lg">{Math.round(c.semanticScore)}</div></div><div><SectionLabel>Classifier</SectionLabel><div className="mono mt-1 text-lg">{Math.round(c.mlScore)}</div></div></div></div><div className="mt-7 grid gap-3 border-t hairline pt-5 sm:grid-cols-3">{[['Matched skills',c.matchedSkills,'bg-[hsl(var(--chart-3)/.12)] text-[hsl(var(--chart-3))]'],['Related skills',c.relatedSkills,'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'],['Missing skills',c.missingSkills,'bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))]']].map(([label,items,tone])=><div key={String(label)}><SectionLabel>{label as string}</SectionLabel><div className="mt-3 flex flex-wrap gap-1.5">{(items as string[]).map(x=><span key={x} className={`rounded px-2 py-1 text-[10px] ${tone}`}>{x}</span>)}</div></div>)}</div></Card><Card className="p-5 sm:p-7"><SectionLabel>Profile evidence</SectionLabel><div className="mt-5 grid gap-6 sm:grid-cols-2"><div><div className="text-xs font-semibold">Education</div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{c.education}</p></div><div><div className="text-xs font-semibold">Certifications</div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{c.certifications.join(', ') || 'None recorded'}</p></div><div><div className="text-xs font-semibold">Source file</div><p className="mono mt-2 text-xs text-[hsl(var(--muted-foreground))]">{c.sourceFile}</p></div><div><div className="text-xs font-semibold">Role history</div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{c.jobTitles?.join(' · ') || 'Not provided'}</p></div></div></Card></div><div className="space-y-5"><Card className="p-5 sm:p-6"><SectionLabel>Recruiter decision</SectionLabel><h2 className="mt-2 text-sm font-semibold">Working notes</h2><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={7} placeholder="Record the evidence behind your decision…" data-testid="textarea-candidate-notes" className="mt-4 w-full resize-none rounded-md border hairline bg-[hsl(var(--background))] p-3 text-xs leading-5 outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.4)]" /><Button onClick={()=>patch(c.status)} disabled={update.isPending} testId="button-save-candidate-notes">Save notes</Button></Card><Card className="p-5 sm:p-6"><SectionLabel>Fairness availability</SectionLabel><div className="mt-4 flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" /><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{c.fairness.message}</p></div></Card><Card className="bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]"><SectionLabel>Interpretation</SectionLabel><p className="mt-4 text-sm leading-6 opacity-85">{c.explanation}</p><Button href={`/explainability?candidate=${c.id}`} variant="outline" testId="button-open-explanation">Inspect explanation <ArrowRight className="h-3.5 w-3.5" /></Button></Card></div></div></>}</QueryMessage></Shell>;
}

function JobsPage() {
  const q=useListJobs(); const create=useCreateJob(); const update=useUpdateJob(); const del=useDeleteJob(); const qc=useQueryClient(); const [selected,setSelected]=useState<string|null>(null); const selectedQuery=useGetJob(selected || '', {query:{queryKey:getGetJobQueryKey(selected || ''),enabled:!!selected}}); const [form,setForm]=useState<JobInput>({title:'',department:'',requiredSkills:[],preferredSkills:[],education:'',minimumExperience:0,certifications:[],description:''}); const [skills,setSkills]=useState('');
  const open=(j?:Job)=>{setSelected(j?.id || null); setForm(j ? {...j} : {title:'',department:'',requiredSkills:[],preferredSkills:[],education:'',minimumExperience:0,certifications:[],description:''}); setSkills(j?.requiredSkills.join(', ') || '');};
  const save=(e:React.FormEvent)=>{e.preventDefault(); const payload={...form,requiredSkills:skills.split(',').map(x=>x.trim()).filter(Boolean)}; const done=()=>{qc.invalidateQueries({queryKey:getListJobsQueryKey()});setSelected(null);}; selected ? update.mutate({id:selected,data:payload},{onSuccess:done}) : create.mutate({data:payload},{onSuccess:done});};
  return <Shell><PageIntro eyebrow="evidence / job context" title="Job descriptions" description="Maintain the job context used to interpret candidate evidence." action={<Button onClick={()=>open()} testId="button-new-job"> </Button>} /><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Card><QueryMessage loading={q.isLoading} error={q.isError} empty={!q.isLoading&&!q.isError&&!q.data?.length} onRetry={()=>q.refetch()}>{(q.data||[]).map(j=><button key={j.id} onClick={()=>open(j)} data-testid={`row-job-${j.id}`} className={`flex w-full items-start gap-3 border-b hairline p-5 text-left last:border-0 hover:bg-[hsl(var(--muted)/.45)] ${selected===j.id?'bg-[hsl(var(--accent)/.1)]':''}`}><div className="grid h-9 w-9 place-items-center rounded bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText className="h-4 w-4"/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{j.title}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{j.department} · {j.minimumExperience} years minimum</div><div className="mt-2 flex flex-wrap gap-1">{j.requiredSkills.slice(0,3).map(s=><span key={s} className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[9px]">{s}</span>)}</div></div><ChevronRight className="mt-1 h-4 w-4 text-[hsl(var(--muted-foreground))]"/></button>)}</QueryMessage></Card><Card className="p-5 sm:p-7" aria-busy={selectedQuery.isFetching}><div className="mb-5 flex items-center justify-between"><div><SectionLabel>{selected?'Edit record':'New record'}</SectionLabel><h2 className="mt-2 text-sm font-semibold">{selected ? 'Update job description' : 'Create job description'}</h2></div>{selected&&<Button onClick={()=>{if(confirm('Delete this job description?')) del.mutate({id:selected},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListJobsQueryKey()});setSelected(null);}})}} variant="danger" testId="button-delete-job"><Trash2 className="h-3.5 w-3.5"/> Delete</Button>}</div><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{[['title','Title'],['department','Department'],['education','Education']].map(([key,label])=><label key={key} className="block text-xs font-semibold">{label}<input value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value})} required={key==='title'} data-testid={`input-job-${key}`} className="mt-2 h-10 w-full rounded-md border hairline bg-[hsl(var(--background))] px-3 text-xs font-normal outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.4)]"/></label>)}<label className="block text-xs font-semibold">Minimum experience<input type="number" min="0" value={form.minimumExperience} onChange={e=>setForm({...form,minimumExperience:Number(e.target.value)})} data-testid="input-job-experience" className="mt-2 h-10 w-full rounded-md border hairline bg-[hsl(var(--background))] px-3 text-xs font-normal"/></label></div><label className="block text-xs font-semibold">Required skills<span className="font-normal text-[hsl(var(--muted-foreground))]"> comma separated</span><input value={skills} onChange={e=>setSkills(e.target.value)} data-testid="input-job-skills" className="mt-2 h-10 w-full rounded-md border hairline bg-[hsl(var(--background))] px-3 text-xs font-normal"/></label><label className="block text-xs font-semibold">Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows={7} data-testid="textarea-job-description-form" className="mt-2 w-full resize-none rounded-md border hairline bg-[hsl(var(--background))] p-3 text-xs font-normal leading-5"/></label><Button type="submit" disabled={create.isPending||update.isPending} testId="button-save-job">{selected?'Save changes':'Create description'} <Check className="h-4 w-4"/></Button></form></Card></div></Shell>;
}

function ResultsPage() { const q=useListScreenings(); const [open,setOpen]=useState<string|null>(null); return <Shell><PageIntro eyebrow="04 / run history" title="Results" description="Review completed screening runs and the ranked candidate evidence they produced." action={<Button href="/screening" testId="button-results-new-run">New screening <Plus className="h-4 w-4"/></Button>} /><Card><QueryMessage loading={q.isLoading} error={q.isError} empty={!q.isLoading&&!q.isError&&!q.data?.length} onRetry={()=>q.refetch()}>{(q.data||[]).map(s=><div key={s.id} className="border-b hairline last:border-0"><button onClick={()=>setOpen(open===s.id?null:s.id)} data-testid={`button-expand-screening-${s.id}`} className="flex w-full items-center gap-4 px-5 py-5 text-left hover:bg-[hsl(var(--muted)/.4)] sm:px-6"><div className="grid h-9 w-9 place-items-center rounded bg-[hsl(var(--secondary))]"><ClipboardCheck className="h-4 w-4 text-[hsl(var(--primary))]"/></div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{s.jobTitle}</div><div className="mt-1 flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]"><span><Clock3 className="mr-1 inline h-3 w-3"/>{new Date(s.screenedAt).toLocaleString()}</span><span>{s.resumeCount} resumes</span><span>{s.shortlistedCount} shortlisted</span></div></div><div className="hidden text-right sm:block"><div className="mono text-lg">{Math.round(s.averageScore)}</div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">average score</div></div><ChevronDown className={`h-4 w-4 transition-transform ${open===s.id?'rotate-180':''}`}/></button>{open===s.id&&<div className="grid gap-3 bg-[hsl(var(--muted)/.3)] px-5 pb-5 pt-1 sm:grid-cols-3 sm:px-20">{[['Input',`${s.resumeCount} resumes`],['Shortlist',`${s.shortlistedCount} candidates`],['Mean score',`${Math.round(s.averageScore)} / 100`]].map(([a,b])=><div key={a} className="rounded border hairline bg-[hsl(var(--card))] p-3"><SectionLabel>{a}</SectionLabel><div className="mono mt-2 text-sm">{b}</div></div>)}</div>}</div>)}</QueryMessage></Card></Shell>; }

function ExplainabilityPage() { const params=new URLSearchParams(window.location.search); const [candidateId,setCandidateId]=useState(params.get('candidate')||''); const [result,setResult]=useState<any>(); const explain=useExplainCandidate(); const candidates=useListCandidates(); const submit=()=>{if(candidateId) explain.mutate({data:{candidateId}},{onSuccess:setResult});}; return <Shell><PageIntro eyebrow="evidence / attribution" title="Explainability" description="Inspect which engineered features pushed the live classifier output up or down." /><Card className="mb-5 p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-xs font-semibold">Candidate record<select value={candidateId} onChange={e=>setCandidateId(e.target.value)} data-testid="select-explanation-candidate" className="mt-2 h-10 w-full rounded-md border hairline bg-[hsl(var(--background))] px-3 text-xs"><option value="">Choose a candidate</option>{(candidates.data||[]).map(c=><option value={c.id} key={c.id}>{c.name} · {c.sourceFile}</option>)}</select></label><Button onClick={submit} disabled={!candidateId||explain.isPending} testId="button-generate-explanation">{explain.isPending?'Computing…':'Generate explanation'} <Network className="h-4 w-4"/></Button></div></Card><QueryMessage loading={candidates.isLoading} error={explain.isError} empty={!result&&!explain.isPending}><>{result&&<div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card className="p-5 sm:p-7"><SectionLabel>Feature attribution</SectionLabel><h2 className="mt-2 text-sm font-semibold">Model contribution view</h2><div className="mt-7 space-y-5">{result.features.map((f:any)=><div key={f.feature}><div className="mb-2 flex justify-between text-xs"><span>{f.feature}</span><span className={`mono ${f.impact>=0?'text-[hsl(var(--chart-3))]':'text-[hsl(var(--destructive))]'}`}>{f.impact>=0?'+':''}{f.impact.toFixed(2)}</span></div><div className="relative h-3 rounded-full bg-[hsl(var(--muted))]"><div className={`absolute h-full rounded-full ${f.impact>=0?'bg-[hsl(var(--chart-3))] left-1/2':'bg-[hsl(var(--destructive))] right-1/2'}`} style={{width:`${Math.min(50,Math.abs(f.impact)*45)}%`}}/></div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{f.direction}</div></div>)}</div><div className="mt-6 flex justify-between border-t hairline pt-3 text-[10px] text-[hsl(var(--muted-foreground))]"><span>reduces score</span><span>baseline</span><span>increases score</span></div></Card><Card className="h-fit p-5 sm:p-7"><SectionLabel>Interpretation</SectionLabel><div className="mt-5 border-l-2 border-[hsl(var(--accent))] pl-4 text-sm leading-7">{result.interpretation}</div><div className="mt-8 rounded-md bg-[hsl(var(--muted)/.65)] p-4"><div className="mono text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Model mode</div><div className="mt-2 text-xs">{result.mode}</div></div><p className="mt-5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Attributions are model evidence, not causal explanations. Use them to focus recruiter review.</p></Card></div>}</></QueryMessage></Shell>; }

type FairnessViewData = {
  demographicsAvailable: boolean;
  message?: string;
  mode?: string;
  metrics: Array<{
    name: string;
    value: number | null;
    interpretation: string;
  }>;
  groups: Array<{
    label: string;
    selectionRate: number;
    count?: number;
  }>;
  screeningDiagnostics?: {
    totalCandidates: number;
    modelSelected: number;
    overallSelectionRate: number;
    strongMatches: number;
    strongMatchRate: number;
    potentialMatches: number;
    potentialMatchRate: number;
    lowMatches: number;
    lowMatchRate: number;
    averageScore: number;
  };
};

function FairnessPage() {
  const q = useGetFairness();
  const f = q.data;
  const data = f as unknown as FairnessViewData | undefined;

  return (
    <Shell>
      <PageIntro
        eyebrow="evidence / equity"
        title="Fairness assessment"
        description="A transparent readout of what the current demonstration data can and cannot support about model screening outcomes."
        action={
          <span className="mono rounded border hairline px-3 py-2 text-[10px] uppercase tracking-wider">
            {data?.mode || 'LIVE_MODEL'}
          </span>
        }
      />

      <QueryMessage
        loading={q.isLoading}
        error={q.isError}
        onRetry={() => q.refetch()}
      >
        {data && (
          <>
            {!data.demographicsAvailable && (
              <div className="mb-5 flex gap-3 rounded-lg border border-[hsl(var(--accent)/.45)] bg-[hsl(var(--accent)/.11)] p-5">
                <Info className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
                <div>
                  <div className="text-sm font-semibold">
                    Assessment boundary
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                    {data.message ||
                      'Demographic fairness metrics cannot be calculated because demographic attributes are not available in the selected candidate dataset.'}
                  </p>
                </div>
              </div>
            )}

            {data.screeningDiagnostics && (
              <div className="mb-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5">
                  <SectionLabel>Total candidates</SectionLabel>
                  <div className="serif mt-4 text-3xl">
                    {data.screeningDiagnostics.totalCandidates}
                  </div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Current candidate records
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionLabel>Model selected</SectionLabel>
                  <div className="serif mt-4 text-3xl">
                    {data.screeningDiagnostics.modelSelected}
                  </div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Score ≥ 50
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionLabel>Selection rate</SectionLabel>
                  <div className="serif mt-4 text-3xl">
                    {Math.round(
                      data.screeningDiagnostics.overallSelectionRate * 100,
                    )}%
                  </div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Model screening diagnostic
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionLabel>Average score</SectionLabel>
                  <div className="serif mt-4 text-3xl">
                    {data.screeningDiagnostics.averageScore.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Live candidate scores
                  </div>
                </Card>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <Card className="p-5 sm:p-7">
                <SectionLabel>Demographic fairness metrics</SectionLabel>

                <div className="mt-5 divide-y hairline">
                  {data.metrics.map(metric => (
                    <div
                      className="flex items-center justify-between gap-4 py-4"
                      key={metric.name}
                    >
                      <div>
                        <div className="text-sm font-semibold">
                          {metric.name}
                        </div>
                        <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {metric.interpretation}
                        </div>
                      </div>

                      <div className="mono text-lg">
                        {metric.value === null
                          ? 'N/A'
                          : metric.value.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 sm:p-7">
                <SectionLabel>Model score distribution</SectionLabel>

                <div className="mt-6 space-y-5">
                  {data.groups.map(group => (
                    <div key={group.label}>
                      <div className="mb-2 flex justify-between text-xs">
                        <span>{group.label}</span>
                        <span className="mono">
                          {group.count ?? 0} ·{' '}
                          {Math.round(group.selectionRate * 100)}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--primary))]"
                          style={{
                            width: `${group.selectionRate * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t hairline pt-5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  <ShieldCheck className="mr-2 inline h-4 w-4 text-[hsl(var(--primary))]" />
                  These bars represent model score bands, not demographic groups.
                  Demographic fairness analysis requires labelled demographic
                  attributes.
                </div>
              </Card>
            </div>
          </>
        )}
      </QueryMessage>
    </Shell>
  );
}

function ModelPage() {
  const q = useGetModelMetrics();
  const dashboardQuery = useGetDashboard();

  const m = q.data;
  const d = dashboardQuery.data;
  const max = Math.max(...(m?.comparison || []).map(x => x.f1), 1);
  const matrixLabels = ['True negative', 'False positive', 'False negative', 'True positive'];

  return (
    <Shell>
      <PageIntro
        eyebrow="evidence / validation"
        title="Model performance"
        description="Held-out evaluation results for the demonstration classifier, with 124 labelled resume–job pairs."
      />

      <QueryMessage
        loading={q.isLoading || dashboardQuery.isLoading}
        error={q.isError || dashboardQuery.isError}
        onRetry={() => {
          q.refetch();
          dashboardQuery.refetch();
        }}
      >
        {m && d && (
          <>
            {/* Existing Overview statistics moved to Model Performance. Values are unchanged. */}
            <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Total resumes', d.stats.totalResumes, 'In corpus', <FileText className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />],
                ['Screened candidates', d.stats.screenedCandidates, 'Across all runs', <UsersRound className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />],
                ['Shortlisted', d.stats.shortlistedCandidates, 'Recruiter decisions', <Target className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />],
                ['Average match', `${Math.round(d.stats.averageMatch)}%`, 'Semantic + ML score', <Activity className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />],
              ].map(([label, value, sub, Icon], i) => (
                <Card
                  key={String(label)}
                  className={`p-5 fade-up delay-${i}`}
                  testId={`metric-${String(label).toLowerCase().replaceAll(' ', '-')}`}
                >
                  <div className="flex items-start justify-between">
                    <SectionLabel>{label as string}</SectionLabel>
                    {Icon}
                  </div>
                  <div className="serif mt-5 text-3xl">{value as string}</div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{sub as string}</div>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
              <Card className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SectionLabel>Research benchmark · test set</SectionLabel>
                    <h2 className="mt-2 text-sm font-semibold">Classification performance</h2>
                  </div>
                  <span className="mono rounded border hairline px-2 py-1 text-[9px] uppercase tracking-wider">
                    n = 124
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {m.metrics.map(metric => (
                    <div key={metric.name} className="rounded-md bg-[hsl(var(--muted)/.65)] p-4">
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">{metric.name}</div>
                      <div className="serif mt-3 text-2xl">{metric.value.toFixed(2)}</div>
                      <div className="mono mt-1 text-[9px] text-[hsl(var(--muted-foreground))]">
                        {Math.round(metric.value * 100)}%
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7">
                  <SectionLabel>Confusion matrix</SectionLabel>
                  <div className="mx-auto mt-4 grid max-w-[260px] grid-cols-2 gap-1">
                    {m.confusionMatrix.flatMap((row, i) =>
                      row.map((v, j) => {
                        const index = i * 2 + j;
                        return (
                          <div
                            key={`${i}-${j}`}
                            className="grid aspect-[1.15] place-items-center rounded bg-[hsl(var(--primary)/.12)] p-2 text-center"
                            style={{
                              opacity: Math.max(.3, v / Math.max(...m.confusionMatrix.flat())),
                            }}
                          >
                            <div>
                              <span className="mono text-base font-semibold">{v}</span>
                              <div className="mt-1 text-[9px]">{matrixLabels[index]}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-3 text-center text-[10px] text-[hsl(var(--muted-foreground))]">
                    Rows: actual class · columns: predicted class
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <SectionLabel>Baseline comparison</SectionLabel>
                    <h2 className="mt-2 text-sm font-semibold">F1 score by model</h2>
                  </div>
                  <span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{m.mode}</span>
                </div>

                <div className="mt-8 space-y-7">
                  {m.comparison.map(x => (
                    <div key={x.model}>
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="font-semibold">{x.model}</span>
                        <span className="mono">{x.f1.toFixed(2)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-[hsl(var(--muted))]">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--accent))]"
                          style={{ width: `${(x.f1 / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 rounded-md border hairline p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  <Info className="mr-2 inline h-4 w-4 text-[hsl(var(--primary))]" />
                  These existing benchmark values are retained unchanged. The website now uses the bundled trained model for new screening inference; the benchmark above remains a separate research-display reference.
                </div>
              </Card>
            </div>
          </>
        )}
      </QueryMessage>
    </Shell>
  );
}

function AboutPage() { return <Shell><PageIntro eyebrow="research context" title="About the study" description="Why this prototype exists, what it makes visible, and where its claims stop." /><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="p-6 sm:p-9"><SectionLabel>Dissertation instrument</SectionLabel><h2 className="serif mt-5 max-w-2xl text-3xl leading-tight">A screening system should be inspected as a chain of evidence, not a single score.</h2><div className="mt-7 max-w-2xl space-y-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>This academic research prototype follows a resume from natural language processing and feature engineering through hashed n-gram semantic representation, cosine similarity, a trained logistic classifier, feature contribution evidence, and a fairness assessment boundary.</p><p>It is designed for recruiters and researchers to ask: which evidence was recognized, which was omitted, and where should human judgment take over?</p></div><div className="mt-9 grid gap-3 sm:grid-cols-2">{[['Make the pipeline legible','See each stage and its handoff.'],['Keep agency with people','AI-assisted decision support; final recruitment decisions remain with the recruiter.'],['Name the unknowns','No demographic data means no claim of bias-free outcomes.'],['Treat scores as prompts','A ranked list is a starting point for review, not a verdict.']].map(([a,b])=><div key={a} className="rounded-md border hairline p-4"><div className="text-xs font-semibold">{a}</div><div className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{b}</div></div>)}</div></Card><div className="space-y-5"><Card className="bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]"><SectionLabel>Integrity protocol</SectionLabel><div className="mt-6 space-y-4">{['Live model version stays visible','Live model metrics are shown separately from the dissertation benchmark','Recruiter controls are explicit and reversible','Fairness limitations are shown beside metrics'].map(x=><div key={x} className="flex gap-3 text-sm"><Check className="h-4 w-4 shrink-0 text-[hsl(var(--accent))]"/><span className="opacity-85">{x}</span></div>)}</div></Card><Card className="p-6"><SectionLabel>System map</SectionLabel><div className="mt-5 space-y-0">{['NLP intake','Feature engineering','Hashed n-gram representation','Cosine similarity','Trained logistic classifier','Feature contribution','Fairness assessment'].map((x,i)=><div className="flex items-center gap-3" key={x}><span className="mono grid h-6 w-6 place-items-center rounded-full bg-[hsl(var(--muted))] text-[9px]">{String(i+1).padStart(2,'0')}</span><span className="text-xs">{x}</span>{i<6&&<div className="absolute ml-3 mt-12 h-3 border-l hairline"/>}</div>)}</div></Card></div></div></Shell>; }

function LoginPage() { const [,setLocation]=useLocation(); return <div className="instrument-shell flex min-h-[100dvh] items-center justify-center p-5 paper-grid"><Card className="w-full max-w-[430px] p-7 sm:p-9"><Link href="/" data-testid="link-login-brand" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-sm bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Sparkles className="h-4 w-4"/></span><span className="serif text-lg">Resume / AI</span></Link><div className="mt-12"><div className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Demo recruiter entry</div><h1 className="serif mt-3 text-4xl">Enter the instrument.</h1><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">This workspace uses demonstration data to make the research pipeline inspectable.</p><form onSubmit={e=>{e.preventDefault();setLocation('/dashboard')}} className="mt-8 space-y-4"><label className="block text-xs font-semibold">Research email<input type="email" required placeholder="researcher@institution.edu" data-testid="input-login-email" className="mt-2 h-11 w-full rounded-md border hairline bg-[hsl(var(--background))] px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.4)]"/></label><label className="block text-xs font-semibold">Access key<input type="password" required placeholder="••••••••" data-testid="input-login-password" className="mt-2 h-11 w-full rounded-md border hairline bg-[hsl(var(--background))] px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.4)]"/></label><Button type="submit" testId="button-login" >Continue to demo <ArrowRight className="h-4 w-4"/></Button></form></div><div className="mt-8 border-t hairline pt-5 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]"><LockKeyhole className="mr-1 inline h-3 w-3"/>No account is created. This is a Prototype Demonstration.</div></Card></div>; }

function AppRouter() { return <ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={Home}/><Route path="/login" component={LoginPage}/><Route path="/dashboard" component={DashboardPage}/><Route path="/screening" component={ScreeningPage}/><Route path="/candidates" component={CandidatesPage}/><Route path="/candidates/:id" component={CandidateProfilePage}/><Route path="/job-description" component={JobsPage}/><Route path="/results" component={ResultsPage}/><Route path="/explainability" component={ExplainabilityPage}/><Route path="/fairness" component={FairnessPage}/><Route path="/model" component={ModelPage}/><Route path="/about" component={AboutPage}/><Route><Home/></Route></Switch></ErrorBoundary>; }
export default function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><AppRouter/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>; }