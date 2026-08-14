import React, { useEffect, useMemo, useState } from "react";
import { api, AppState } from "../api";
import { PreviewVideo } from "../PreviewVideo";
import { newId } from "../lib";
import type { BrandPreset, Theme } from "@engine/engine/types";
import { DISPLAY_FONTS, UI_FONTS, MONO_FONTS, FontOption } from "@engine/brands/fonts";
import { buildFromTemplate, defaultInputs, getTemplate, templatesForKit } from "@engine/generate/templates";
import { SURFACE_IDS } from "@engine/brands/story/surfaces";

const COLORS: [keyof Theme, string][] = [
  ["accent", "Accent"], ["accentInk", "Accent text"], ["ink", "Ink"], ["ink2", "Muted ink"],
  ["paper", "Paper"], ["card", "Card"], ["line", "Line"], ["tint", "Tint"],
];

const clone = <T,>(x: T): T => structuredClone(x);

const FontSelect: React.FC<{ label: string; opts: FontOption[]; value: string; onChange: (v: string) => void; testid: string }> =
({ label, opts, value, onChange, testid }) => (
  <div>
    <label className="f">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      {opts.map((o) => <option key={o.family} value={o.family}>{o.label}</option>)}
    </select>
  </div>
);

export const Style: React.FC<{
  state: AppState; brand: BrandPreset; refresh: () => void; onSelectBrand: (id: string) => void;
}> = ({ state, brand: stored, refresh, onSelectBrand }) => {
  const [draft, setDraft] = useState<BrandPreset>(() => clone(stored));

  // Reload the draft when the selected brand changes.
  useEffect(() => { setDraft(clone(stored)); /* eslint-disable-next-line */ }, [stored.id]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);
  const isActive = state.settings.activeBrand === draft.id;

  const setTok = (k: keyof Theme, v: any) => setDraft((d) => ({ ...d, theme: { ...d.theme, [k]: v } }));
  const toggleSurface = (id: string) => setDraft((d) => {
    const cur = d.surfaces ?? [];
    const surfaces = cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id];
    return { ...d, surfaces: surfaces.length ? surfaces : undefined };
  });

  // Preview with a template that matches this brand's kit, so the sample looks
  // the way the brand actually renders.
  const sampleSpec = useMemo(() => {
    const tpl = templatesForKit(draft.kit)[0] ?? getTemplate("countdown");
    return buildFromTemplate(tpl.id, defaultInputs(tpl), { brand: draft.id, handle: draft.theme.handle });
  }, [draft.id, draft.kit, draft.theme.handle]);

  const save = async () => { await api.saveBrand(draft); refresh(); };
  const saveActivate = async () => { await api.saveBrand(draft); await api.setActiveBrand(draft.id); refresh(); };
  const duplicate = async () => {
    const p: BrandPreset = { ...clone(stored), id: newId("brand"), name: stored.name + " copy" };
    await api.saveBrand(p); refresh(); onSelectBrand(p.id);
  };
  const remove = async () => {
    if (state.brands.length <= 1) return;
    if (!confirm(`Delete brand "${stored.name}"? This cannot be undone.`)) return;
    const ns = await api.deleteBrand(stored.id); refresh(); onSelectBrand(ns.brands[0].id);
  };

  return (
    <div className="screen wide" data-testid="screen-style">
      <div>
        <div className="headrow">
          <div>
            <p className="sub">The complete look and voice of this brand — palette, fonts, feel, narrator, music and the video worlds it rotates through.</p>
          </div>
          <div className="row">
            <button className="btn subtle sm" onClick={duplicate} data-testid="brand-duplicate">Duplicate</button>
            <button className="btn danger sm" onClick={remove} disabled={state.brands.length <= 1} data-testid="brand-delete">Delete</button>
          </div>
        </div>

        <div className="card">
          <div className="cardhead"><span className="cardtitle">Brand</span>{isActive && <span className="badge accent">Default</span>}</div>
          <label className="f">Name</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-testid="brand-name" />
        </div>

        <div className="card">
          <div className="cardhead"><span className="cardtitle">Palette</span></div>
          <div className="swatches">
            {COLORS.map(([k, label]) => (
              <div className="swrow" key={k}>
                <span className="lab">{label}</span>
                <input type="color" value={String(draft.theme[k])} onChange={(e) => setTok(k, e.target.value)} data-testid={`color-${k}`} />
                <input type="text" value={String(draft.theme[k])} onChange={(e) => setTok(k, e.target.value)} data-testid={`hex-${k}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="cardhead"><span className="cardtitle">Fonts</span></div>
          <div className="grid3">
            <FontSelect label="Display" opts={DISPLAY_FONTS} value={draft.theme.fontDisplay} onChange={(v) => setTok("fontDisplay", v)} testid="font-display" />
            <FontSelect label="Body / UI" opts={UI_FONTS} value={draft.theme.fontUi} onChange={(v) => setTok("fontUi", v)} testid="font-ui" />
            <FontSelect label="Mono" opts={MONO_FONTS} value={draft.theme.fontMono} onChange={(v) => setTok("fontMono", v)} testid="font-mono" />
          </div>
        </div>

        <div className="card">
          <div className="cardhead"><span className="cardtitle">Feel</span></div>
          <label className="f">Corner radius</label>
          <div className="rangerow">
            <input type="range" min={0} max={32} value={draft.theme.radius} onChange={(e) => setTok("radius", Number(e.target.value))} data-testid="radius" />
            <span className="val">{draft.theme.radius}px</span>
          </div>
          <label className="f" style={{ marginTop: 12 }}>Motion</label>
          <div className="rangerow">
            <input type="range" min={0.4} max={1.6} step={0.1} value={draft.theme.motionScale} onChange={(e) => setTok("motionScale", Number(e.target.value))} data-testid="motion" />
            <span className="val">{draft.theme.motionScale.toFixed(1)}×</span>
          </div>
          <p className="help">Lower is snappier, higher is more relaxed. Affects how entrances stagger in.</p>
        </div>

        <div className="card">
          <div className="cardhead"><span className="cardtitle">Voice &amp; music</span></div>
          <div className="grid2">
            <div>
              <label className="f">Narrator voice ID</label>
              <input value={draft.voiceId ?? ""} placeholder="ElevenLabs voice id" onChange={(e) => setDraft({ ...draft, voiceId: e.target.value || undefined })} data-testid="brand-voice" />
              <p className="help">Default narrator for this brand. Leave empty to use the app default from .env.local; paste any ElevenLabs voice ID to override.</p>
              <label className="f" style={{ marginTop: 12 }}>Logo</label>
              <input value={draft.logo ?? ""} placeholder="path under public/, e.g. logos/fieldnotes.png" onChange={(e) => setDraft({ ...draft, logo: e.target.value || undefined })} data-testid="brand-logo" />
              <p className="help">Shown small and centred as the end-card of every video. Empty = a monogram of the publication initial.</p>
            </div>
            <div>
              <label className="f">Music mood</label>
              <input value={draft.musicMood ?? ""} placeholder="e.g. somber strings, slow" onChange={(e) => setDraft({ ...draft, musicMood: e.target.value || undefined })} data-testid="brand-music" />
            </div>
          </div>
          <p className="help">Used when generating story voiceovers and music beds. A story script can still override the voice per story.</p>
        </div>

        <div className="card">
          <div className="cardhead"><span className="cardtitle">Surfaces</span></div>
          <div className="tagrow">
            {SURFACE_IDS.map((id) => (
              <label key={id} className="check">
                <input type="checkbox" checked={(draft.surfaces ?? []).includes(id)} onChange={() => toggleSurface(id)} data-testid={`surface-${id}`} />
                {id}
              </label>
            ))}
          </div>
          <p className="help">The video worlds this brand rotates through. A story can pick one explicitly with a "surface" field; otherwise the engine rotates deterministically per title.</p>
        </div>

        <div className="card">
          <div className="cardhead"><span className="cardtitle">On-screen identity</span></div>
          <div className="grid3">
            <div><label className="f">Publication</label><input value={draft.theme.publication} onChange={(e) => setTok("publication", e.target.value)} data-testid="publication" /></div>
            <div><label className="f">Edition</label><input value={draft.theme.edition} onChange={(e) => setTok("edition", e.target.value)} data-testid="edition" /></div>
            <div><label className="f">Handle</label><input value={draft.theme.handle} onChange={(e) => setTok("handle", e.target.value)} data-testid="handle" /></div>
          </div>
          <p className="help">Shown on every frame (the spine label and footer). Handle is used in generated call-to-actions.</p>
        </div>

        <div className="btnrow">
          <button className="btn" onClick={save} disabled={!dirty} data-testid="brand-save">Save</button>
          <button className="btn subtle" onClick={saveActivate} data-testid="brand-save-active">Save &amp; make default</button>
          {dirty ? <span className="badge warn">Unsaved changes</span> : <span className="muted">All changes saved</span>}
        </div>
      </div>

      <div className="previewPane">
        <div className="previewBox" data-testid="brand-preview">
          <PreviewVideo spec={sampleSpec} themeOverride={draft.theme} />
        </div>
        <div className="previewMeta"><span>Live preview</span><span>{draft.name}</span></div>
      </div>
    </div>
  );
};
