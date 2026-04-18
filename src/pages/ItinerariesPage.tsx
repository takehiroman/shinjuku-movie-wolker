import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Itinerary, SettingsView, Theater } from "../domain/types";
import { todayDateString } from "../lib/date";
import { ErrorState } from "../components/ErrorState";
import { FilterBar } from "../components/FilterBar";
import { ItineraryList } from "../components/ItineraryList";
import { LoadingState } from "../components/LoadingState";

interface ItinerariesApiResponse {
  itineraries: Itinerary[];
  meta: {
    availableTheaters?: Theater[];
    bufferMinutes?: number;
  };
}

function parseArray(value: string | null): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

export function ItinerariesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [date, setDate] = useState(searchParams.get("date") ?? todayDateString());
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [tagsText, setTagsText] = useState(searchParams.get("tags") ?? "");
  const [startTime, setStartTime] = useState(searchParams.get("startTime") ?? "");
  const [endTime, setEndTime] = useState(searchParams.get("endTime") ?? "");
  const [selectedTheaterIds, setSelectedTheaterIds] = useState<string[]>(parseArray(searchParams.get("theaterIds")));
  const [bufferMinutes, setBufferMinutes] = useState<number>(Number(searchParams.get("bufferMinutes") ?? 20));

  const hasBufferMinutesParam = searchParams.has("bufferMinutes");
  const startScreeningId = searchParams.get("startScreeningId") ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadSettings(): Promise<void> {
      if (hasBufferMinutesParam) {
        setSettingsLoaded(true);
        return;
      }

      const response = await fetch("/api/settings");
      const data = (await response.json()) as { settings: SettingsView };
      if (!cancelled) {
        setBufferMinutes(data.settings.bufferMinutes);
        setTheaters(data.settings.theaters);
        setSettingsLoaded(true);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [hasBufferMinutesParam]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("date", date);
    params.set("bufferMinutes", String(bufferMinutes));
    if (keyword.trim()) {
      params.set("keyword", keyword.trim());
    }
    if (tagsText.trim()) {
      params.set("tags", tagsText.trim());
    }
    if (startTime) {
      params.set("startTime", startTime);
    }
    if (endTime) {
      params.set("endTime", endTime);
    }
    if (selectedTheaterIds.length) {
      params.set("theaterIds", selectedTheaterIds.join(","));
    }
    if (startScreeningId) {
      params.set("startScreeningId", startScreeningId);
    }
    return params.toString();
  }, [bufferMinutes, date, endTime, keyword, selectedTheaterIds, startScreeningId, startTime, tagsText]);

  useEffect(() => {
    setSearchParams(new URLSearchParams(queryString), { replace: true });
  }, [queryString, setSearchParams]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    let cancelled = false;

    async function run(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/itineraries?${queryString}`);
        const data = (await response.json()) as ItinerariesApiResponse | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "梯子候補の取得に失敗しました");
        }

        if (!cancelled) {
          setItineraries(data.itineraries);
          setTheaters(data.meta.availableTheaters ?? []);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "梯子候補の取得に失敗しました");
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
  }, [queryString, settingsLoaded]);

  function toggleTheater(theaterId: string): void {
    setSelectedTheaterIds((current) =>
      current.includes(theaterId)
        ? current.filter((id) => id !== theaterId)
        : [...current, theaterId],
    );
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <p className="eyebrow">Itineraries</p>
        <h2>同日に梯子可能な2本組み合わせ</h2>
        {startScreeningId ? <p className="muted">起点上映を固定して候補を表示しています。</p> : null}
      </section>

      <FilterBar
        date={date}
        keyword={keyword}
        tagsText={tagsText}
        startTime={startTime}
        endTime={endTime}
        theaters={theaters}
        selectedTheaterIds={selectedTheaterIds}
        onDateChange={setDate}
        onKeywordChange={setKeyword}
        onTagsTextChange={setTagsText}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        onTheaterToggle={toggleTheater}
        onApply={() => setSearchParams(new URLSearchParams(queryString))}
        extraContent={
          <label className="field">
            <span>bufferMinutes</span>
            <input
              type="number"
              min={0}
              max={180}
              value={bufferMinutes}
              onChange={(event) => setBufferMinutes(Number(event.target.value))}
            />
          </label>
        }
      />

      {loading && itineraries.length === 0 ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!error && (!loading || itineraries.length > 0) ? <ItineraryList itineraries={itineraries} /> : null}
    </div>
  );
}
