import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, AppState, StoryInfo, QaOverlap } from "../api";
import type { BrandPreset } from "@engine/engine/types";

// Stories — author a script, then run the pipeline per story:
// Generate voiceover (ElevenLabs + timings + bed) -> Fetch footage -> Render.
// Render is GATED on the text-overlap QA (story:qa runs the probe in a hidden
// window; design law: no label may ever collide) — "Render anyway" overrides.

const scriptTemplate = (brandId: string) => JSON.stringify({
  title: "New story",
  brand: brandId,
  context: "2026 · Topic",
  status: "Data story",
  beats: [
    {
      say: "Opening narration line. Spell numbers out for the voice.",
      lines: ["Opening caption,", "short and bold."],
      visual: { type: "statement" },
    },
    {
      say: "A number worth showing, three thousand of something.",
      lines: ["3,000 of something"],
      visual: { type: "stat", value: 3000, label: "what it measures" },
    },
  ],
}, null, 2);

/** Client-side mirror of the main-process validation, for live feedback. */
function validateJson(json: string): string | null {
  let s: any;
  try { s = JSON.parse(json); } catch (e: any) { return "Not valid JSON: " + e.message; }
  if (!s || typeof s !== "object" || Array.isArray(s)) return "Script must be a JSON object.";
  if (typeof s.title !== "string" || !s.title.trim()) return 'Script needs a "title" string.';
  if (!Array.isArray(s.beats) || s.beats.length === 0) return 'Script needs a non-empty "beats" array.';
  for (let i = 0; i < s.beats.length; i++) {
    const b = s.beats[i];
    if (!b || typeof b !== "object") return `Beat ${i} must be an object.`;
    if (typeof b.say !== "string" || !b.say.trim()) return `Beat ${i} needs a "say" string.`;
    if (b.lines !== undefined && (!Array.isArray(b.lines) || b.lines.some((l: any) => typeof l !== "string")))
      return `Beat ${i}: "lines" must be an array of strings.`;
    if (b.visual !== undefined && (typeof b.visual !== "object" || typeof b.visual?.type !== "string"))
      return `Beat ${i}: "visual" must be an object with a "type".`;
  }
  return null;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-_]*$/;

type Action = "generate" | "footage" | "qa" | "render";

const qaFailText = (overlaps: QaOverlap[], samples: number) => {
  const o = overlaps[0];
  return `QA failed: ${overlaps.length} overlapping text pair(s) in ${samples} sampled frames. `
    + `First at ${o.time}s: "${o.textA}" overlaps "${o.textB}" (${o.overlapPx}px²).`;
};
interface Editor { slug: string; json: string; isNew: boolean }

const Chip: React.FC<{ on: boolean; label: string; testid: string }> = ({ on, label, testid }) => (
  <span className={"badge" + (on ? " good" : "")} data-testid={testid} data-on={on ? "1" : "0"}>
    {on ? "✓ " : ""}{label}
  </span>
);

export const Stories: React.FC<{ state: AppState; brand: BrandPreset; refresh: () => void }> = ({ state, brand, refresh }) => {
  const [stories, setStories] = useState<StoryInfo[] | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ slug: string; action: Action } | null>(null);
  const [msg, setMsg] = useState<Record<string, { kind: "ok" | "err"; text: string }>>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  // slugs whose render was refused by QA — unlocks the "Render anyway" override
  const [qaBlocked, setQaBlocked] = useState<Record<string, boolean>>({});
  const editorRef = useRef<HTMLDivElement>(null);

  // The editor card sits under the list — bring it into view when it opens.
  useEffect(() => { if (editor) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [editor?.slug, editor?.isNew]);

  const load = useCallback(async () => {
    const r = await api.storyList();
    if (r.ok) { setStories(r.stories); setListErr(null); } else setListErr(r.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  const mine = (stories ?? []).filter((s) => s.brand === brand.id);

  const renderedSlugs = new Set(
    state.projects
      .map((p) => String((p.spec as any)?.audioSrc ?? "").match(/^stories\/([^/]+)\/narration\.mp3$/)?.[1])
      .filter(Boolean) as string[],
  );

  const run = async (slug: string, action: Action, opts: { skipQa?: boolean } = {}) => {
    setBusy({ slug, action });
    setMsg((m) => ({ ...m, [slug]: undefined as any }));
    try {
      if (action === "generate") {
        const r = await api.storyGenerate(slug);
        setMsg((m) => ({ ...m, [slug]: r.ok ? { kind: "ok", text: `Voiceover generated (${r.total.toFixed(1)}s) — narration, timings and music bed written.` } : { kind: "err", text: r.error } }));
      } else if (action === "footage") {
        const r = await api.storyFootage(slug);
        setMsg((m) => ({ ...m, [slug]: r.ok
          ? { kind: r.remaining > 0 ? "err" : "ok", text: `Footage: ${r.resolved} clip(s) resolved, ${r.remaining} still unresolved.` + (r.notes.length ? " " + r.notes.join("; ") : "") }
          : { kind: "err", text: r.error } }));
      } else if (action === "qa") {
        const r = await api.storyQa(slug);
        setMsg((m) => ({ ...m, [slug]: !r.ok
          ? { kind: "err", text: "QA could not run: " + r.error }
          : r.pass
            ? { kind: "ok", text: `QA passed — no overlapping text (${r.samples} sample frames).` }
            : { kind: "err", text: qaFailText(r.overlaps, r.samples) } }));
      } else {
        // Render — gated on the overlap QA unless explicitly overridden.
        if (!opts.skipQa) {
          const q = await api.storyQa(slug);
          if (!q.ok) {
            setQaBlocked((b) => ({ ...b, [slug]: true }));
            setMsg((m) => ({ ...m, [slug]: { kind: "err", text: `Render blocked — QA could not run (${q.error}). Fix it, or use Render anyway.` } }));
            return;
          }
          if (!q.pass) {
            setQaBlocked((b) => ({ ...b, [slug]: true }));
            setMsg((m) => ({ ...m, [slug]: { kind: "err", text: qaFailText(q.overlaps, q.samples) + " Render refused — fix the script/blocks, or use Render anyway." } }));
            return;
          }
        }
        const r = await api.storyRender(slug);
        if (r.ok) setQaBlocked((b) => ({ ...b, [slug]: false }));
        setMsg((m) => ({ ...m, [slug]: r.ok ? { kind: "ok", text: (opts.skipQa ? "Rendered (QA skipped)" : "Rendered (QA passed)") + " — saved to this brand's Library. " + r.output } : { kind: "err", text: r.error } }));
      }
    } finally {
      setBusy(null);
      await load();
      refresh(); // renders add Library projects
    }
  };

  const openNew = () => {
    setSaveErr(null);
    setEditor({ slug: "", json: scriptTemplate(brand.id), isNew: true });
  };
  const openEdit = async (slug: string) => {
    setSaveErr(null);
    const r = await api.storyGet(slug);
    if (r.ok) setEditor({ slug, json: r.json, isNew: false });
    else setMsg((m) => ({ ...m, [slug]: { kind: "err", text: r.error } }));
  };
  const save = async () => {
    if (!editor) return;
    const slugErr = SLUG_RE.test(editor.slug) ? null : "Name must be a slug: lowercase letters, digits, dashes (e.g. my-story).";
    const jsonErr = validateJson(editor.json);
    if (slugErr || jsonErr) { setSaveErr(slugErr || jsonErr); return; }
    const r = await api.storySave(editor.slug, editor.json);
    if (!r.ok) { setSaveErr(r.error); return; }
    setEditor(null); setSaveErr(null);
    await load();
  };

  const jsonErrLive = editor ? validateJson(editor.json) : null;
  const busyLabel: Record<Action, string> = { generate: "Generating…", footage: "Fetching…", qa: "Checking…", render: "Rendering…" };

  return (
    <div className="screen single" data-testid="screen-stories">
      <div className="headrow">
        <div>
          <p className="sub">A story is a scripted data-video: write the beats, generate the voiceover and music, resolve footage, then render it into this brand's Library.</p>
        </div>
        <button className="btn" onClick={openNew} data-testid="story-new">+ New story</button>
      </div>

      <div className="card">
        {listErr && <p className="err" data-testid="stories-err">{listErr}</p>}
        {stories === null && !listErr && <div className="muted">Loading stories…</div>}
        {stories !== null && mine.length === 0 && (
          <div className="empty" data-testid="stories-empty">
            No stories for this brand yet.<br />Create one with <strong>+ New story</strong>.
          </div>
        )}
        <div className="list">
          {mine.map((s) => {
            const rendered = renderedSlugs.has(s.slug);
            const b = (a: Action) => busy?.slug === s.slug && busy.action === a;
            const anyBusy = busy?.slug === s.slug;
            const m = msg[s.slug];
            return (
              <div className="item" key={s.slug} data-testid={`story-${s.slug}`}>
                <div className="main">
                  <div className="name">{s.title} <span className="muted mono">{s.slug}</span>{s.surface ? <span className="badge">{s.surface}</span> : null}</div>
                  <div className="meta tagrow" style={{ marginTop: 6 }}>
                    <Chip on={s.hasTimings} label="voiceover" testid={`chip-voiceover-${s.slug}`} />
                    <Chip on={s.unresolvedFootage === 0} label={s.unresolvedFootage === 0 ? "footage" : `footage (${s.unresolvedFootage} unresolved)`} testid={`chip-footage-${s.slug}`} />
                    <Chip on={rendered} label="rendered" testid={`chip-rendered-${s.slug}`} />
                  </div>
                  {m && <p className={m.kind === "ok" ? "ok" : "err"} data-testid={`story-msg-${s.slug}`} style={{ marginTop: 8, fontSize: 12 }}>{m.text}</p>}
                </div>
                <div className="actions">
                  <button className="btn ghost sm" onClick={() => openEdit(s.slug)} disabled={anyBusy} data-testid={`story-edit-${s.slug}`}>Edit</button>
                  <button className="btn subtle sm" onClick={() => run(s.slug, "generate")} disabled={anyBusy} data-testid={`story-generate-${s.slug}`}>
                    {b("generate") ? <span className="spin" /> : null}{b("generate") ? busyLabel.generate : "Generate voiceover"}
                  </button>
                  <button className="btn subtle sm" onClick={() => run(s.slug, "footage")} disabled={anyBusy} data-testid={`story-footage-${s.slug}`}>
                    {b("footage") ? <span className="spin" /> : null}{b("footage") ? busyLabel.footage : "Fetch footage"}
                  </button>
                  <button className="btn subtle sm" onClick={() => run(s.slug, "qa")} disabled={anyBusy || !s.hasTimings} title={s.hasTimings ? "Check every beat for overlapping text" : "Generate the voiceover first"} data-testid={`story-qa-${s.slug}`}>
                    {b("qa") ? <span className="spin" /> : null}{b("qa") ? busyLabel.qa : "QA"}
                  </button>
                  <button className="btn sm" onClick={() => run(s.slug, "render")} disabled={anyBusy || !s.hasTimings} title={s.hasTimings ? "Runs the overlap QA first" : "Generate the voiceover first"} data-testid={`story-render-${s.slug}`}>
                    {b("render") ? <span className="spin" /> : null}{b("render") ? busyLabel.render : "Render"}
                  </button>
                  {qaBlocked[s.slug] && (
                    <button className="btn ghost sm" onClick={() => run(s.slug, "render", { skipQa: true })} disabled={anyBusy} title="Skip the overlap QA once and render regardless" data-testid={`story-render-anyway-${s.slug}`}>
                      Render anyway
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editor && (
        <div className="card" data-testid="story-editor" ref={editorRef}>
          <div className="cardhead"><span className="cardtitle">{editor.isNew ? "New story" : `Edit story — ${editor.slug}`}</span></div>
          {editor.isNew && (
            <>
              <label className="f">Name (slug)</label>
              <input value={editor.slug} placeholder="my-story" onChange={(e) => setEditor({ ...editor, slug: e.target.value })} data-testid="story-slug" />
            </>
          )}
          <label className="f" style={{ marginTop: editor.isNew ? 12 : 0 }}>Script JSON</label>
          <textarea className="code" style={{ minHeight: 320 }} value={editor.json} onChange={(e) => setEditor({ ...editor, json: e.target.value })} data-testid="story-json" />
          <p className="help" data-testid="story-json-status">
            {jsonErrLive ? <span className="err">{jsonErrLive}</span> : <span className="ok">Valid script — format per src/stories/README.md.</span>}
          </p>
          <div className="btnrow">
            <button className="btn" onClick={save} disabled={!!jsonErrLive} data-testid="story-save">Save story</button>
            <button className="btn ghost" onClick={() => setEditor(null)} data-testid="story-cancel">Cancel</button>
            {saveErr && <span className="err" data-testid="story-save-err">{saveErr}</span>}
          </div>
        </div>
      )}
    </div>
  );
};
