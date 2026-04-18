import type { Screening } from "../domain/types";
import { formatTimeLabel } from "../lib/date";

interface ScreeningCardProps {
  screening: Screening;
  onSelect: () => void;
}

export function ScreeningCard({ screening, onSelect }: ScreeningCardProps) {
  return (
    <article className="card">
      <div className="card-row">
        <div>
          <p className="card-meta">{screening.theaterName}</p>
          <h3>{screening.movieTitle}</h3>
          <p className="muted">
            {formatTimeLabel(screening.startAt)} - {formatTimeLabel(screening.endAt)}
            {screening.screenName ? ` / ${screening.screenName}` : ""}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onSelect}>
          この上映から梯子候補
        </button>
      </div>
      <div className="tag-row">
        {screening.tags.length ? (
          screening.tags.map((tag) => (
            <span key={tag} className="pill">
              {tag}
            </span>
          ))
        ) : (
          <span className="muted">タグなし</span>
        )}
      </div>
    </article>
  );
}
