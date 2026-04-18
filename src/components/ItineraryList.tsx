import type { Itinerary } from "../domain/types";
import { EmptyState } from "./EmptyState";
import { ItineraryCard } from "./ItineraryCard";

interface ItineraryListProps {
  itineraries: Itinerary[];
}

export function ItineraryList({ itineraries }: ItineraryListProps) {
  if (!itineraries.length) {
    return (
      <EmptyState
        title="梯子可能な組み合わせがありません"
        description="bufferMinutes や映画館条件を変えると候補が見つかるかもしれません。"
      />
    );
  }

  return (
    <div className="stack">
      {itineraries.map((itinerary) => (
        <ItineraryCard key={`${itinerary.firstScreening.id}:${itinerary.secondScreening.id}`} itinerary={itinerary} />
      ))}
    </div>
  );
}
