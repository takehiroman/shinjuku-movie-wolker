import type { Itinerary, Screening } from "../domain/types";
import { formatTimeLabel } from "../lib/date";

interface ItineraryCardProps {
  itinerary: Itinerary;
}

function BookingLink({ screening }: { screening: Screening }) {
  if (!screening.bookingUrl) {
    return null;
  }

  return (
    <a
      href={screening.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="booking-link"
    >
      予約する ↗
    </a>
  );
}

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  return (
    <article className="card">
      <div className="itinerary-grid">
        <section>
          <p className="card-meta">1本目</p>
          <h3>{itinerary.firstScreening.movieTitle}</h3>
          <p className="muted">{itinerary.firstScreening.theaterName}</p>
          <p>
            {formatTimeLabel(itinerary.firstScreening.startAt)} - {formatTimeLabel(itinerary.firstScreening.endAt)}
          </p>
          <BookingLink screening={itinerary.firstScreening} />
        </section>
        <section>
          <p className="card-meta">2本目</p>
          <h3>{itinerary.secondScreening.movieTitle}</h3>
          <p className="muted">{itinerary.secondScreening.theaterName}</p>
          <p>
            {formatTimeLabel(itinerary.secondScreening.startAt)} - {formatTimeLabel(itinerary.secondScreening.endAt)}
          </p>
          <BookingLink screening={itinerary.secondScreening} />
        </section>
      </div>
      <div className="stats-row">
        <span className="pill">移動 {itinerary.travelMinutes}分</span>
        <span className="pill">待ち {itinerary.waitMinutes}分</span>
        <span className="pill">合計余裕 {itinerary.totalMinutes}分</span>
      </div>
    </article>
  );
}
