import React, { useState } from "react";
import { api, AppState, Channel } from "../api";
import { describeCron, validateCron, newId, SCHEDULE_PRESETS } from "../lib";
import { getTemplate, templatesForKit } from "@engine/generate/templates";
import type { BrandPreset } from "@engine/engine/types";

/** Channels scoped to one brand: the list is filtered, and a new channel is
 *  pre-bound to this brand (no brand picker). */
export const Channels: React.FC<{ state: AppState; brand: BrandPreset; refresh: () => void }> = ({ state, brand, refresh }) => {
  const [edit, setEdit] = useState<Channel | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ id: string; path: string } | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);

  const channels = state.channels.filter((c) => c.brand === brand.id);
  const templates = templatesForKit(brand.kit);

  const blank = (): Channel => ({
    id: newId("ch"), name: "New channel", brand: brand.id,
    template: templates[0]?.id ?? "countdown", scheduleCron: "0 7 * * 1", enabled: false, count: 5, look: "neon",
  });

  const save = async () => { if (edit) { await api.saveChannel(edit); setEdit(null); refresh(); } };
  const del = async () => {
    if (!edit) return;
    if (!confirm(`Delete channel "${edit.name}"?`)) return;
    await api.deleteChannel(edit.id); setEdit(null); refresh();
  };
  const toggle = (c: Channel) => api.setChannelEnabled(c.id, !c.enabled).then(refresh);
  const run = async (c: Channel) => {
    setRunningId(c.id); setRunErr(null); setRunResult(null);
    try { const path = await api.runChannel(c.id); setRunResult({ id: c.id, path }); refresh(); }
    catch (e: any) { setRunErr(e?.message ?? String(e)); }
    finally { setRunningId(null); }
  };

  const cronValid = edit ? validateCron(edit.scheduleCron) : true;

  return (
    <div className="screen single" data-testid="screen-channels">
      <div className="headrow">
        <div>
          <p className="sub">A channel renders a {brand.name} video automatically on a schedule while the app is open. Run one now to see the result, or set it live.</p>
        </div>
        <button className="btn" onClick={() => setEdit(blank())} data-testid="channel-new">+ New channel</button>
      </div>

      <div className="card">
        {channels.length === 0 && <div className="empty" data-testid="channels-empty">No channels for this brand yet.<br />Create one to render videos on a schedule.</div>}
        <div className="list">
          {channels.map((c) => (
            <div className="item" key={c.id} data-testid={`channel-${c.id}`}>
              <div className="main">
                <div className="name">{c.name} {c.enabled ? <span className="badge good">Live</span> : <span className="badge">Paused</span>}</div>
                <div className="meta">
                  {getTemplate(c.template || "countdown").label} · {describeCron(c.scheduleCron)} · {c.count} items
                </div>
                {runResult?.id === c.id && (
                  <div className="meta"><span className="ok">Rendered.</span> <button className="linkbtn" style={{ color: "var(--accent)" }} onClick={() => api.openPath(runResult.path)}>Reveal file</button></div>
                )}
              </div>
              <div className="actions">
                <button className="btn ghost sm" onClick={() => toggle(c)} data-testid={`channel-toggle-${c.id}`}>{c.enabled ? "Pause" : "Enable"}</button>
                <button className="btn ghost sm" onClick={() => setEdit({ ...c })} data-testid={`channel-edit-${c.id}`}>Edit</button>
                <button className="btn sm" onClick={() => run(c)} disabled={runningId === c.id} data-testid={`channel-run-${c.id}`}>{runningId === c.id ? "Running…" : "Run now"}</button>
              </div>
            </div>
          ))}
        </div>
        {runErr && <p className="err" data-testid="channel-run-err">{runErr}</p>}
      </div>

      {edit && (
        <div className="card" data-testid="channel-editor">
          <div className="cardhead"><span className="cardtitle">{state.channels.some((c) => c.id === edit.id) ? "Edit channel" : "New channel"}</span><span className="badge">{brand.name}</span></div>
          <label className="f">Name</label>
          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-testid="channel-name" />

          <label className="f" style={{ marginTop: 12 }}>Template</label>
          <select value={edit.template} onChange={(e) => setEdit({ ...edit, template: e.target.value })} data-testid="channel-template">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>

          <label className="f" style={{ marginTop: 12 }}>Schedule</label>
          <div className="row" style={{ marginBottom: 8 }}>
            {SCHEDULE_PRESETS.map((p) => (
              <button key={p.cron} className={"btn sm " + (edit.scheduleCron === p.cron ? "" : "subtle")} onClick={() => setEdit({ ...edit, scheduleCron: p.cron })} data-testid={`sched-${p.cron.replace(/[^0-9]/g, "")}`}>{p.label}</button>
            ))}
          </div>
          <input className="mono" value={edit.scheduleCron} onChange={(e) => setEdit({ ...edit, scheduleCron: e.target.value })} data-testid="channel-cron" />
          <p className="help" data-testid="cron-desc">
            {cronValid ? <>Runs: <strong style={{ color: "var(--ink)" }}>{describeCron(edit.scheduleCron)}</strong>. Cron format: minute hour day-of-month month day-of-week.</> : <span className="err">Not a valid cron expression (needs 5 fields).</span>}
          </p>

          <div className="grid2" style={{ marginTop: 12 }}>
            <div>
              <label className="f">Items</label>
              <input type="number" min={3} max={5} value={edit.count} onChange={(e) => setEdit({ ...edit, count: Number(e.target.value) })} data-testid="channel-count" />
            </div>
            <div>
              <label className="f">Media look</label>
              <select value={edit.look} onChange={(e) => setEdit({ ...edit, look: e.target.value })} data-testid="channel-look">
                <option value="neon">Neon</option><option value="ember">Ember</option><option value="forest">Forest</option>
              </select>
            </div>
          </div>

          <div className="btnrow">
            <button className="btn" onClick={save} disabled={!cronValid} data-testid="channel-save">Save</button>
            <button className="btn ghost" onClick={() => setEdit(null)} data-testid="channel-cancel">Cancel</button>
            {state.channels.some((c) => c.id === edit.id) && <button className="btn danger" onClick={del} data-testid="channel-delete">Delete</button>}
          </div>
        </div>
      )}
    </div>
  );
};
