import { useState } from "react";
import { JsonImportForm } from "../components/JsonImportForm";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";

const samplePayload = `{
  "theaters": [
    { "id": "wald9", "name": "新宿バルト9", "area": "shinjuku" },
    { "id": "toho-shinjuku", "name": "TOHOシネマズ新宿", "area": "shinjuku" }
  ],
  "movies": [
    { "id": "movie-1", "title": "映画A" },
    { "id": "movie-2", "title": "映画B" }
  ],
  "screenings": [
    {
      "id": "scr-1",
      "theaterId": "wald9",
      "movieId": "movie-1",
      "screenName": "SCREEN1",
      "startAt": "2026-04-18T09:00:00+09:00",
      "endAt": "2026-04-18T11:10:00+09:00",
      "durationMinutes": 130,
      "tags": ["subtitle"],
      "targetDate": "2026-04-18"
    }
  ],
  "travelTimes": [
    {
      "fromTheaterId": "wald9",
      "toTheaterId": "toho-shinjuku",
      "travelMinutes": 12
    }
  ]
}`;

export function AdminImportPage() {
  const [value, setValue] = useState(samplePayload);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submitImport(): Promise<void> {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(value) as unknown;
      const response = await fetch("/api/admin/import-screenings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = (await response.json()) as { imported: Record<string, number> } | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "インポートに失敗しました");
      }

      setResult(
        `theaters: ${data.imported.theaters}, movies: ${data.imported.movies}, screenings: ${data.imported.screenings}, travelTimes: ${data.imported.travelTimes}`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "インポートに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <p className="eyebrow">Admin Import</p>
        <h2>JSONから初期データを投入</h2>
      </section>
      {error ? <ErrorState message={error} /> : null}
      {result ? <EmptyState title="インポート完了" description={result} /> : null}
      <JsonImportForm value={value} onChange={setValue} onSubmit={submitImport} loading={loading} />
    </div>
  );
}
