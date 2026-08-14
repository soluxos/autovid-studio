import React, { useEffect, useState } from "react";
import { api, AppState, KeyStatus, KeysStatus } from "../api";

type KeyId = "elevenlabs" | "pexels";

const BADGE: Record<string, { text: string; cls: string }> = {
  settings: { text: "Saved", cls: "badge good" },
  env: { text: "From .env.local", cls: "badge accent" },
  none: { text: "Not set", cls: "badge" },
};

const statusBadge = (s?: KeyStatus) => BADGE[s?.source ?? "none"];

/** One provider row: password box + status badge + a Clear affordance. */
const KeyRow: React.FC<{
  id: KeyId; label: string; value: string; status?: KeyStatus;
  onChange: (v: string) => void; onClear: () => void; children: React.ReactNode;
}> = ({ id, label, value, status, onChange, onClear, children }) => {
  const b = statusBadge(status);
  return (
    <div className="field" style={{ marginBottom: 16 }}>
      <div className="row spread" style={{ marginBottom: 6 }}>
        <label className="f" style={{ margin: 0 }} htmlFor={`key-input-${id}`}>{label}</label>
        <span className={b.cls} data-testid={`key-status-${id}`}>{b.text}</span>
      </div>
      <div className="inline">
        <input
          id={`key-input-${id}`}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={status?.masked ?? "Paste your key"}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`key-${id}`}
        />
        <button className="btn ghost sm" onClick={onClear} data-testid={`key-clear-${id}`}>Clear</button>
      </div>
      <p className="help">{children}</p>
    </div>
  );
};

export const Settings: React.FC<{ state: AppState; refresh: () => void }> = ({ state, refresh }) => {
  const latest = state.projects.find((p) => p.output);
  const setActive = (id: string) => api.setActiveBrand(id).then(refresh);

  const [keys, setKeys] = useState<KeysStatus | null>(null);
  const [draft, setDraft] = useState<Record<KeyId, string>>({ elevenlabs: "", pexels: "" });
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const loadKeys = async () => {
    const r = await api.keysStatus();
    if (r.ok) setKeys(r.status); else setErr(r.error);
  };
  useEffect(() => { loadKeys(); }, []);

  const apply = async (payload: { elevenlabs?: string; pexels?: string }, message: string) => {
    setErr(""); setNote("");
    const r = await api.keysSave(payload);
    if (!r.ok) { setErr(r.error); return; }
    setKeys(r.status);
    setDraft({ elevenlabs: "", pexels: "" });
    setNote(message);
  };

  // Blank fields are left untouched, so saving one key never wipes the other.
  const save = () => apply(
    { elevenlabs: draft.elevenlabs.trim() || undefined, pexels: draft.pexels.trim() || undefined },
    "Saved on this machine.",
  );
  const clear = (id: KeyId) => apply({ [id]: "" }, `Cleared the ${id === "pexels" ? "Pexels" : "ElevenLabs"} key.`);

  return (
    <div className="screen single" data-testid="screen-settings">
      <div className="headrow">
        <div>
          <h1 className="title">Settings</h1>
          <p className="sub">Defaults and status for the app.</p>
        </div>
      </div>

      <div className="card">
        <div className="cardhead"><span className="cardtitle">Default brand</span></div>
        <select value={state.settings.activeBrand} onChange={(e) => setActive(e.target.value)} data-testid="settings-active-brand">
          {state.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <p className="help">The brand opened when the app starts. Each brand's look, voice and surfaces live in its own Style tab.</p>
      </div>

      <div className="card">
        <div className="cardhead"><span className="cardtitle">API keys</span></div>

        <KeyRow
          id="elevenlabs" label="ElevenLabs" value={draft.elevenlabs} status={keys?.elevenlabs}
          onChange={(v) => setDraft((d) => ({ ...d, elevenlabs: v }))} onClear={() => clear("elevenlabs")}
        >
          Powers the narration voiceover. Get a key at elevenlabs.io. Required to generate a voiceover;
          the voice itself is chosen per brand in its Style tab.
        </KeyRow>

        <KeyRow
          id="pexels" label="Pexels (optional)" value={draft.pexels} status={keys?.pexels}
          onChange={(v) => setDraft((d) => ({ ...d, pexels: v }))} onClear={() => clear("pexels")}
        >
          Powers stock footage and photos. Free key at pexels.com/api. Optional: without it, footage falls
          back to the Library of Congress and Wikimedia Commons.
        </KeyRow>

        <div className="btnrow">
          <button className="btn" onClick={save} data-testid="keys-save">Save keys</button>
          {note && <span className="ok" data-testid="keys-note">{note}</span>}
          {err && <span className="err" data-testid="keys-error">{err}</span>}
        </div>

        <p className="help" style={{ marginTop: 12 }}>
          Keys are stored locally on this machine only (in this app's own data folder) and never leave it
          except to call the provider. Leaving a field blank keeps the key already saved; use Clear to remove one.
          A key saved here wins over a developer <code>.env.local</code> file, which is why a fresh copy of the
          app only needs your own keys pasted in here.
        </p>
      </div>

      <div className="card">
        <div className="cardhead"><span className="cardtitle">Status</span></div>
        <div className="grid3">
          <div><div className="muted">Brands</div><div style={{ fontSize: 22, fontWeight: 700 }} data-testid="stat-brands">{state.brands.length}</div></div>
          <div><div className="muted">Channels</div><div style={{ fontSize: 22, fontWeight: 700 }} data-testid="stat-channels">{state.channels.length}</div></div>
          <div><div className="muted">Rendered videos</div><div style={{ fontSize: 22, fontWeight: 700 }} data-testid="stat-projects">{state.projects.length}</div></div>
        </div>
        <div className="btnrow">
          <button className="btn subtle sm" onClick={() => latest && api.openPath(latest.output!)} disabled={!latest} data-testid="reveal-latest">Reveal latest render</button>
        </div>
      </div>

      <div className="notice">
        Automated channels run only while this app is open. To run them 24/7, the same engine and scheduler can later live on an always-on machine, with this app as the control panel — the stored state is plain JSON, so it moves easily.
      </div>
    </div>
  );
};
