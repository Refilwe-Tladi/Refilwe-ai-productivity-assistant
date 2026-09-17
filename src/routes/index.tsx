import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUp,
  Bot,
  Check,
  CheckSquare2,
  Clipboard,
  FileText,
  LayoutDashboard,
  Mail,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type Tool = "email" | "notes" | "planner" | "research" | "chat";

type ToolConfig = {
  id: Tool;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Mail;
  placeholder: string;
  contextPlaceholder: string;
};

const emailTool: ToolConfig = { id: "email", label: "Smart Email Generator", shortLabel: "Email Generator", description: "Draft precise messages in your voice", icon: Mail, placeholder: "Request sign-off on the Q3 launch plan by Friday", contextPlaceholder: "Recipient, relationship, key facts, deadline…" };

const tools: ToolConfig[] = [
  emailTool,
  { id: "notes", label: "Meeting Notes Summarizer", shortLabel: "Meeting Notes", description: "Turn transcripts into decisions", icon: FileText, placeholder: "Paste your meeting transcript or notes…", contextPlaceholder: "Meeting title, attendees, and any priorities…" },
  { id: "planner", label: "AI Task Planner", shortLabel: "Task Planner", description: "Break goals into an actionable plan", icon: CheckSquare2, placeholder: "Plan the Q3 launch across product, design, and marketing", contextPlaceholder: "Deadline, available time, team, constraints…" },
  { id: "research", label: "AI Research Assistant", shortLabel: "Research", description: "Build structured research briefs", icon: Search, placeholder: "Compare onboarding approaches for B2B SaaS products", contextPlaceholder: "Audience, scope, known facts, questions to answer…" },
  { id: "chat", label: "AI Chatbot Interface", shortLabel: "Chatbot", description: "Think through your next move", icon: Bot, placeholder: "What should I prioritize this afternoon?", contextPlaceholder: "Optional background or constraints…" },
];

const initialOutput: Record<Tool, string> = {
  email: "Subject: Q3 Launch Plan — Sign-off needed by Friday\n\nHi Dana,\n\nI've attached the finalized Q3 launch plan. The critical path is the beta rollout on the 14th, and I'd appreciate your sign-off by Friday so we can hold the vendor timeline.\n\nLet me know if you'd like to walk through any section together.\n\nThanks,\nPriya",
  notes: "Summary\nThe product team aligned on expanding the beta cohort and identified onboarding as the next retention lever.\n\nDecisions\n• Expand beta access to 500 users.\n• Pause the paid pilot until the CAC report is complete.\n\nAction items\n• Marcus: Ship onboarding revisions by the 20th.\n• Priya: Circulate the updated launch plan.",
  planner: "1. Draft the Q3 launch brief — 90 min\n   Lead with the shipping date and resolve the two open questions.\n\n2. Review the vendor deck — 30 min\n   Check pricing, milestones, and ownership.\n\n3. Prepare sync talking points — 20 min\n   Focus on launch risks and decisions needed today.",
  research: "Research brief\n\nEstablished context\n• Guided onboarding works best when it reaches a meaningful first outcome quickly.\n• Role-specific paths can reduce irrelevant steps.\n\nQuestions to verify\n• Which activation event correlates most strongly with retention?\n• Where do current users abandon setup?\n\nRecommended next step\nInterview five recently activated and five churned customers before changing the flow.",
  chat: "Your launch brief is the highest-leverage task because it unblocks both the vendor review and the afternoon sync. Start with a 25-minute outline, then resolve the two open questions before polishing the wording.",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Workplace Productivity Assistant | Veridian" },
      { name: "description", content: "Draft emails, summarize meetings, plan work, research topics, and chat with an AI workplace assistant." },
      { property: "og:title", content: "AI Workplace Productivity Assistant | Veridian" },
      { property: "og:description", content: "Five focused AI tools for faster, clearer workplace output." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const [activeTool, setActiveTool] = useState<Tool>("email");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prompt, setPrompt] = useState("Request sign-off on the Q3 launch plan by Friday");
  const [context, setContext] = useState("Dana Okafor — Head of Growth. Confident, warm, and brief. Beta rollout begins on the 14th.");
  const [output, setOutput] = useState(initialOutput.email);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const active = useMemo(() => tools.find((tool) => tool.id === activeTool) ?? emailTool, [activeTool]);

  function selectTool(id: Tool) {
    const next = tools.find((tool) => tool.id === id) ?? emailTool;
    setActiveTool(id);
    setPrompt(next.placeholder);
    setContext("");
    setOutput(initialOutput[id]);
    setError("");
    setMobileOpen(false);
  }

  async function generate() {
    if (!prompt.trim()) {
      setError("Add a goal or source text before generating.");
      return;
    }
    setIsGenerating(true);
    setError("");
    setOutput("");
    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: activeTool, prompt, context }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "The AI request could not be completed.");
      }
      if (!response.body) throw new Error("The AI returned an empty response.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setOutput(result);
      }
      if (!result.trim()) throw new Error("The AI finished without a draft. Please try a more specific prompt.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setOutput(initialOutput[activeTool]);
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      <div className="pointer-events-none fixed inset-0 ambient-grid" aria-hidden="true" />
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <Sidebar activeTool={activeTool} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onSelect={selectTool} />

      <main className="relative min-h-screen lg:pl-64">
        <header className="glass sticky top-0 z-20 flex h-[68px] items-center gap-3 border-x-0 border-t-0 px-4 sm:px-6 lg:px-8">
          <button aria-label="Open navigation" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Good morning, Priya</p>
            <h1 className="truncate font-display text-base font-bold sm:text-lg">AI Workplace Productivity Assistant</h1>
          </div>
          <div className="ml-auto hidden w-56 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-muted-foreground md:flex">
            <span className="size-1.5 rounded-full bg-cyan animate-pulse-soft" />
            <span className="truncate">All systems ready</span>
          </div>
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan to-brand font-display text-sm font-semibold text-primary-foreground">PM</div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6 lg:p-8">
          <section aria-label="AI tools" className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const selected = tool.id === activeTool;
              return (
                <button key={tool.id} onClick={() => selectTool(tool.id)} className={`group min-h-[104px] rounded-lg border p-3 text-left transition duration-200 ${selected ? "border-primary/50 bg-brand-soft shadow-[0_10px_30px_-20px_var(--brand)]" : "border-border bg-surface hover:border-primary/30 hover:bg-surface-strong"}`}>
                  <div className={`grid size-8 place-items-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-surface-strong text-muted-foreground group-hover:text-foreground"}`}><Icon className="size-4" /></div>
                  <p className="mt-3 text-xs font-semibold leading-tight sm:text-[13px]">{tool.shortLabel}</p>
                  <p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">{tool.description}</p>
                </button>
              );
            })}
          </section>

          <section className="glass animate-rise overflow-hidden rounded-[22px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand"><active.icon className="size-4" /></div>
                <div><h2 className="font-display text-base font-semibold">{active.label}</h2><p className="text-[11px] text-muted-foreground">Structured prompt · editable output</p></div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan"><Sparkles className="size-3" /> AI ready</span>
            </div>

            <div className="grid lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
              <div className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
                <label htmlFor="prompt" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{activeTool === "notes" ? "Meeting notes" : activeTool === "chat" ? "Your message" : "Goal"}</label>
                <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={activeTool === "notes" ? 8 : 4} placeholder={active.placeholder} className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
                <label htmlFor="context" className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Context <span className="normal-case tracking-normal">(optional)</span></label>
                <textarea id="context" value={context} onChange={(event) => setContext(event.target.value)} rows={3} placeholder={active.contextPlaceholder} className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
                {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive-foreground">{error}</p>}
                <button onClick={generate} disabled={isGenerating} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-violet font-display text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-14px_var(--brand)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-65">
                  {isGenerating ? <><RefreshCw className="size-4 animate-spin" /> Creating draft…</> : <><Sparkles className="size-4" /> Generate {activeTool === "chat" ? "response" : "draft"}</>}
                </button>
              </div>

              <div className="flex min-h-[410px] flex-col p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Editable AI output</p><p className="mt-0.5 text-[10px] text-muted-foreground/70">Review every detail before use</p></div>
                  <div className="flex gap-2">
                    <button title="Reset output" aria-label="Reset output" onClick={() => setOutput(initialOutput[activeTool])} className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:text-foreground"><RefreshCw className="size-3.5" /></button>
                    <button title="Copy output" aria-label="Copy output" onClick={copyOutput} className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground">{copied ? <Check className="size-3.5 text-success" /> : <Clipboard className="size-3.5" />}{copied ? "Copied" : "Copy"}</button>
                  </div>
                </div>
                <textarea aria-label="Editable AI output" value={output} onChange={(event) => setOutput(event.target.value)} placeholder={isGenerating ? "Your draft will appear here…" : "Generate a draft to begin."} className="output-surface min-h-[300px] flex-1 resize-none rounded-xl border border-border p-4 font-sans text-sm leading-7 text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 sm:p-5" />
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>{output.trim() ? `${output.trim().split(/\s+/).length} words` : "Empty draft"}</span><span>Changes save in this session</span></div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="glass rounded-xl p-5 lg:col-span-2">
              <div className="flex items-center justify-between"><h2 className="font-display text-sm font-semibold">Today’s focus</h2><span className="text-[10px] text-muted-foreground">3 tasks · 2h 20m</span></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[['1','Draft Q3 launch brief','90 min'],['2','Review vendor deck','30 min'],['3','Prep sync talking points','20 min']].map(([number, label, time], index) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"><span className={`grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-bold ${index === 0 ? "bg-primary text-primary-foreground" : "bg-surface-strong text-muted-foreground"}`}>{number}</span><span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span><span className="text-[10px] text-muted-foreground">{time}</span></div>
                ))}
              </div>
            </section>
            <section className="glass rounded-xl p-5">
              <div className="flex items-center justify-between"><h2 className="font-display text-sm font-semibold">Recent activity</h2><span className="text-[10px] text-muted-foreground">Today</span></div>
              <div className="mt-4 space-y-3">
                <Activity icon={Mail} label="Client follow-up drafted" time="9:12 AM" />
                <Activity icon={FileText} label="Product sync summarized" time="8:40 AM" />
                <Activity icon={Search} label="Competitor brief created" time="Yesterday" />
              </div>
            </section>
          </div>

          <footer className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-[11px] leading-relaxed text-muted-foreground sm:flex-row sm:items-center">
            <ShieldCheck className="size-4 shrink-0 text-warning" />
            <p><strong className="font-semibold text-foreground">Responsible AI:</strong> Veridian can make mistakes. Verify facts, protect confidential information, and review every output before sharing or acting on it.</p>
            <span className="sm:ml-auto sm:whitespace-nowrap">Your judgment leads</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ activeTool, mobileOpen, onClose, onSelect }: { activeTool: Tool; mobileOpen: boolean; onClose: () => void; onSelect: (tool: Tool) => void }) {
  return (
    <aside className={`glass fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-y-0 border-l-0 p-5 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center gap-3 px-1"><div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-violet font-display text-lg font-bold text-primary-foreground">V</div><div><p className="font-display text-[15px] font-semibold leading-none">Veridian</p><p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">AI Workspace</p></div><button aria-label="Close navigation" onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground lg:hidden"><X className="size-4" /></button></div>
      <p className="mb-2 mt-8 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
      <button onClick={() => onSelect("email")} className="flex items-center gap-3 rounded-lg bg-surface-strong px-3 py-2.5 text-left text-sm font-medium"><LayoutDashboard className="size-4 text-cyan" /> Overview</button>
      <p className="mb-2 mt-7 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI tools</p>
      <nav className="space-y-1" aria-label="AI tools">
        {tools.map((tool) => { const Icon = tool.icon; const selected = activeTool === tool.id; return <button key={tool.id} onClick={() => onSelect(tool.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${selected ? "bg-brand-soft font-medium text-foreground ring-1 ring-primary/35" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}><Icon className={`size-4 ${selected ? "text-cyan" : ""}`} /><span>{tool.shortLabel}</span>{selected && <span className="ml-auto size-1.5 rounded-full bg-cyan" />}</button>; })}
      </nav>
      <div className="mt-auto rounded-xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="size-4 text-warning" /> Responsible AI</div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Outputs are AI-generated drafts. Review before use.</p></div>
      <div className="mt-3 flex items-center gap-3 rounded-lg px-2 py-2"><div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-cyan to-primary text-[11px] font-bold text-primary-foreground">PM</div><div><p className="text-xs font-medium">Priya Mehta</p><p className="text-[10px] text-muted-foreground">Product Manager</p></div></div>
    </aside>
  );
}

function Activity({ icon: Icon, label, time }: { icon: typeof Mail; label: string; time: string }) {
  return <div className="flex items-center gap-3"><div className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-3.5" /></div><div className="min-w-0"><p className="truncate text-xs font-medium">{label}</p><p className="text-[10px] text-muted-foreground">{time}</p></div><ArrowUp className="ml-auto size-3 rotate-45 text-muted-foreground/50" /></div>;
}