import type { SettingsView } from "../domain/types";

interface SettingsFormProps {
  settings: SettingsView;
  onBufferMinutesChange: (value: number) => void;
  onToggleTheater: (theaterId: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function SettingsForm(props: SettingsFormProps) {
  const { settings, onBufferMinutesChange, onToggleTheater, onSave, saving } = props;

  return (
    <section className="panel">
      <h2>基本設定</h2>
      <label className="field">
        <span>bufferMinutes</span>
        <input
          type="number"
          min={0}
          max={180}
          value={settings.bufferMinutes}
          onChange={(event) => onBufferMinutesChange(Number(event.target.value))}
        />
      </label>
      <div className="field">
        <span>対象映画館</span>
        <div className="chip-grid">
          {settings.theaters.map((theater) => {
            const checked = settings.enabledTheaterIds.includes(theater.id);
            return (
              <label key={theater.id} className={checked ? "chip chip-active" : "chip"}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleTheater(theater.id)}
                />
                <span>{theater.name}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="actions">
        <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>
    </section>
  );
}
