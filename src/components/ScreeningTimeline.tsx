import type { Screening } from "../domain/types";
import { ScreeningCard } from "./ScreeningCard";
import { EmptyState } from "./EmptyState";

interface ScreeningTimelineProps {
  screenings: Screening[];
  onSelectScreening: (screening: Screening) => void;
}

export function ScreeningTimeline({ screenings, onSelectScreening }: ScreeningTimelineProps) {
  if (!screenings.length) {
    return <EmptyState title="上映が見つかりません" description="条件を変えると候補が増える場合があります。" />;
  }

  return (
    <div className="stack">
      {screenings.map((screening) => (
        <ScreeningCard
          key={screening.id}
          screening={screening}
          onSelect={() => onSelectScreening(screening)}
        />
      ))}
    </div>
  );
}
