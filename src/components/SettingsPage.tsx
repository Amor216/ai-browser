import type { SearchEngine, Settings, ThemeMode } from "../../shared/ipc.js";

type Props = {
  settings: Settings;
  onChange(patch: Partial<Settings>): void;
};

export function SettingsPage({ settings, onChange }: Props) {
  return (
    <div className="internal-page">
      <div className="internal-head">
        <h1>Settings</h1>
      </div>
      <div className="internal-body settings-body">
        <Section title="Appearance">
          <Row label="Theme">
            <Select<ThemeMode>
              value={settings.theme}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={(v) => onChange({ theme: v })}
            />
          </Row>
          <Row label="Show bookmarks bar">
            <Toggle
              checked={settings.showBookmarkBar}
              onChange={(v) => onChange({ showBookmarkBar: v })}
            />
          </Row>
        </Section>

        <Section title="Search">
          <Row label="Default search engine">
            <Select<SearchEngine>
              value={settings.searchEngine}
              options={[
                { value: "duckduckgo", label: "DuckDuckGo" },
                { value: "google", label: "Google" },
                { value: "bing", label: "Bing" },
              ]}
              onChange={(v) => onChange({ searchEngine: v })}
            />
          </Row>
          <Row label="Homepage / new tab URL">
            <input
              className="settings-input"
              value={settings.homepage}
              onChange={(e) => onChange({ homepage: e.target.value })}
            />
          </Row>
        </Section>

        <Section title="AI assistant">
          <Row label="Model">
            <input
              className="settings-input"
              value={settings.agentModel}
              onChange={(e) => onChange({ agentModel: e.target.value })}
            />
          </Row>
          <Row label="Max tool-use steps per turn">
            <input
              className="settings-input narrow"
              type="number"
              min={1}
              max={50}
              value={settings.agentMaxSteps}
              onChange={(e) => onChange({ agentMaxSteps: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Row>
        </Section>

        <Section title="About">
          <p className="settings-note">ai-browser — Electron + Anthropic SDK.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange(v: boolean): void }) {
  return (
    <button
      className={`toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-knob" />
    </button>
  );
}

type Option<T extends string> = { value: T; label: string };

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Option<T>[];
  onChange(v: T): void;
}) {
  return (
    <select
      className="settings-input"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
