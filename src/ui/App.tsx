import React, { useEffect, useState } from "react";
import { api, AppState } from "./api";
import { QAProbe } from "./QAProbe";
import { Stories } from "./screens/Stories";
import { Channels } from "./screens/Channels";
import { Library } from "./screens/Library";
import { Style } from "./screens/Style";
import { Settings } from "./screens/Settings";
import { newId } from "./lib";
import type { BrandPreset } from "@engine/engine/types";
import { EDITORIAL_THEME } from "@engine/brands/editorial/tokens";

// Brand-centric navigation (docs/BRAND-SYSTEM.md §4): the sidebar lists brands;
// inside a brand: Stories | Channels | Library | Style. Settings stays global.

type BrandTab = "stories" | "channels" | "library" | "style";
const BRAND_TABS: [BrandTab, string][] = [
  ["stories", "Stories"], ["channels", "Channels"], ["library", "Library"], ["style", "Style"],
];

type View = { kind: "brand"; id: string } | { kind: "settings" };

// "#qa/<slug>" loads the text-overlap QA probe instead of the dashboard —
// used by scripts/qa-story.mjs and the story:qa hidden window (render gate).
export const App: React.FC = () =>
  window.location.hash.startsWith("#qa") ? <QAProbe /> : <AppMain />;

const AppMain: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [tab, setTab] = useState<BrandTab>("stories");

  const refresh = async () => {
    const s = await api.getState();
    setState(s);
    // If the selected brand was deleted, fall back to the first one.
    setView((v) => (v?.kind === "brand" && !s.brands.some((b) => b.id === v.id)) ? { kind: "brand", id: s.brands[0].id } : v);
    return s;
  };
  useEffect(() => {
    api.getState().then((s) => { setState(s); setView({ kind: "brand", id: s.settings.activeBrand }); });
  }, []);

  if (!state || !view) return <div className="loading" data-testid="loading">Loading…</div>;

  const selectBrand = (id: string) => setView({ kind: "brand", id });
  const newBrand = async () => {
    const p: BrandPreset = { id: newId("brand"), name: "New brand", kit: "editorial", theme: structuredClone(EDITORIAL_THEME) };
    await api.saveBrand(p);
    await refresh();
    setView({ kind: "brand", id: p.id });
    setTab("style");
  };

  const brand = view.kind === "brand"
    ? state.brands.find((b) => b.id === view.id) ?? state.brands[0]
    : null;

  return (
    <div className="app" data-testid="app">
      <aside className="sidebar">
        <div className="brandmark">autovid <span>studio</span></div>
        <div className="navhint">a studio per brand</div>
        <div className="navsec">Brands</div>
        {state.brands.map((b) => (
          <button
            key={b.id}
            className={"nav" + (view.kind === "brand" && brand?.id === b.id ? " active" : "")}
            onClick={() => selectBrand(b.id)}
            data-testid={`nav-brand-${b.id}`}
          >
            <span className="dot" style={{ background: b.theme.accent, opacity: 1 }} /> {b.name}
          </button>
        ))}
        <button className="nav navnew" onClick={newBrand} data-testid="brand-new">+ New brand</button>
        <div className="sidefoot">
          <button className={"nav" + (view.kind === "settings" ? " active" : "")} onClick={() => setView({ kind: "settings" })} data-testid="nav-settings">
            <span className="dot" /> Settings
          </button>
          <div style={{ padding: "8px 6px" }}>Automated channels run while this app is open.</div>
        </div>
      </aside>
      <main className="content">
        {view.kind === "settings" && <Settings state={state} refresh={refresh} />}
        {view.kind === "brand" && brand && (
          <div data-testid={`workspace-${brand.id}`}>
            <div className="wshead">
              <div>
                <h1 className="title">{brand.name}</h1>
                <div className="muted">{brand.theme.publication} · {brand.theme.handle} · {brand.kit} kit</div>
              </div>
              <div className="segmented" data-testid="brand-tabs">
                {BRAND_TABS.map(([t, label]) => (
                  <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)} data-testid={`tab-${t}`}>{label}</button>
                ))}
              </div>
            </div>
            {tab === "stories" && <Stories state={state} brand={brand} refresh={refresh} />}
            {tab === "channels" && <Channels state={state} brand={brand} refresh={refresh} />}
            {tab === "library" && <Library state={state} brand={brand} refresh={refresh} />}
            {tab === "style" && <Style state={state} brand={brand} refresh={refresh} onSelectBrand={selectBrand} />}
          </div>
        )}
      </main>
    </div>
  );
};
