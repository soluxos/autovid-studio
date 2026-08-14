import React, { useEffect } from "react";
import { api, AppState } from "../api";
import { fmtDate } from "../lib";
import type { BrandPreset } from "@engine/engine/types";

/** This brand's rendered videos — from Stories, or from a channel run. */
export const Library: React.FC<{ state: AppState; brand: BrandPreset; refresh: () => void }> = ({ state, brand, refresh }) => {
  // Renders can arrive from a channel while this tab is open — pull fresh state.
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const projects = state.projects.filter((p) => p.brand === brand.id);

  return (
    <div className="screen single" data-testid="screen-library">
      <div className="headrow">
        <div>
          <p className="sub">Every {brand.name} video you render — from Stories or from a channel — lands here.</p>
        </div>
        <button className="btn subtle sm" onClick={refresh} data-testid="library-refresh">Refresh</button>
      </div>

      <div className="card">
        {projects.length === 0 && (
          <div className="empty" data-testid="library-empty">
            Nothing rendered for this brand yet.<br />Render a video from <strong>Stories</strong>, or <strong>Run now</strong> on a channel.
          </div>
        )}
        <div className="list">
          {projects.map((p) => (
            <div className="item" key={p.id} data-testid={`project-${p.id}`}>
              <div className="main">
                <div className="name">{p.title}</div>
                <div className="meta">
                  {p.template ? `${p.template} · ` : ""}{fmtDate(p.createdAt)}
                </div>
              </div>
              <div className="actions">
                {p.output
                  ? <button className="btn ghost sm" onClick={() => api.openPath(p.output!)} data-testid={`reveal-${p.id}`}>Reveal file</button>
                  : <span className="badge warn">No file</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
