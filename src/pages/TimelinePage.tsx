import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Screening, Theater } from "../domain/types";
import { todayDateString } from "../lib/date";
import { ErrorState } from "../components/ErrorState";
import { FilterBar } from "../components/FilterBar";
import { LoadingState } from "../components/LoadingState";
import { ScreeningTimeline } from "../components/ScreeningTimeline";

interface ScreeningsApiResponse {
  screenings: Screening[];
  meta: {
    availableTheaters?: Theater[];
  };
}

function parseArray(value: string | null): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

export function TimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(searchParams.get("date") ?? todayDateString());
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [tagsText, setTagsText] = useState(searchParams.get("tags") ?? "");
  const [startTime, setStartTime] = useState(searchParams.get("startTime") ?? "");
  const [endTime, setEndTime] = useState(searchParams.get("endTime") ?? "");
  const [selectedTheaterIds, setSelectedTheaterIds] = useState<string[]>(parseArray(searchParams.get("theaterIds")));

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("date", date);
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
    return params.toString();
  }, [date, endTime, keyword, selectedTheaterIds, startTime, tagsText]);

  useEffect(() => {
    setSearchParams(new URLSearchParams(queryString), { replace: true });
  }, [queryString, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/screenings?${queryString}`);
        const data = (await response.json()) as ScreeningsApiResponse | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "上映取得に失敗しました");
        }

        if (!cancelled) {
          setScreenings(data.screenings);
          setTheaters(data.meta.availableTheaters ?? []);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "上映取得に失敗しました");
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
  }, [queryString]);

  function toggleTheater(theaterId: string): void {
    setSelectedTheaterIds((current) =>
      current.includes(theaterId)
        ? current.filter((id) => id !== theaterId)
        : [...current, theaterId],
    );
  }

  function handleScreeningSelect(screening: Screening): void {
    const params = new URLSearchParams(queryString);
    params.delete("startTime");
    params.delete("endTime");
    params.set("startScreeningId", screening.id);
    navigate(`/itineraries?${params.toString()}`);
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <p className="eyebrow">Timeline</p>
        <h2>新宿の上映を横断して時系列表示</h2>
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
      />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? (
        <ScreeningTimeline screenings={screenings} onSelectScreening={handleScreeningSelect} />
      ) : null}
    </div>
  );
}
