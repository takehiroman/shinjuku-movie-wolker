import { useEffect, useState } from "react";
import type { SettingsView, TravelTime } from "../domain/types";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { SettingsForm } from "../components/SettingsForm";
import { TravelTimeMatrixEditor } from "../components/TravelTimeMatrixEditor";

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      setLoading(true);
      try {
        const response = await fetch("/api/settings");
        const data = (await response.json()) as { settings: SettingsView } | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "設定取得に失敗しました");
        }

        if (!cancelled) {
          setSettings(data.settings);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "設定取得に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleTheater(theaterId: string): void {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        enabledTheaterIds: current.enabledTheaterIds.includes(theaterId)
          ? current.enabledTheaterIds.filter((id) => id !== theaterId)
          : [...current.enabledTheaterIds, theaterId],
      };
    });
  }

  function updateTravelTimes(travelTimes: TravelTime[]): void {
    setSettings((current) => (current ? { ...current, travelTimes } : current));
  }

  async function saveSettings(): Promise<void> {
    if (!settings) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bufferMinutes: settings.bufferMinutes,
          enabledTheaterIds: settings.enabledTheaterIds,
          travelTimes: settings.travelTimes,
        }),
      });
      const data = (await response.json()) as { settings: SettingsView } | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "設定保存に失敗しました");
      }

      setSettings(data.settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "設定保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <p className="eyebrow">Settings</p>
        <h2>梯子条件と映画館設定</h2>
      </section>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {settings ? (
        <>
          <SettingsForm
            settings={settings}
            onBufferMinutesChange={(value) =>
              setSettings((current) => (current ? { ...current, bufferMinutes: value } : current))
            }
            onToggleTheater={toggleTheater}
            onSave={saveSettings}
            saving={saving}
          />
          <TravelTimeMatrixEditor
            theaters={settings.theaters}
            travelTimes={settings.travelTimes}
            onChange={updateTravelTimes}
          />
        </>
      ) : null}
    </div>
  );
}
