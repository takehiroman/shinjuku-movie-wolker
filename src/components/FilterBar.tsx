import type { ReactNode } from "react";
import type { Theater } from "../domain/types";

interface FilterBarProps {
  date: string;
  keyword: string;
  tagsText: string;
  theaters: Theater[];
  selectedTheaterIds: string[];
  onDateChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onTagsTextChange: (value: string) => void;
  onTheaterToggle: (theaterId: string) => void;
  onApply: () => void;
  extraContent?: ReactNode;
}

export function FilterBar(props: FilterBarProps) {
  const {
    date,
    keyword,
    tagsText,
    theaters,
    selectedTheaterIds,
    onDateChange,
    onKeywordChange,
    onTagsTextChange,
    onTheaterToggle,
    onApply,
    extraContent,
  } = props;

  return (
    <section className="panel">
      <div className="filter-grid">
        <label className="field">
          <span>日付</span>
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <label className="field">
          <span>作品名検索</span>
          <input
            type="text"
            value={keyword}
            placeholder="映画タイトルで絞り込み"
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </label>
        <label className="field">
          <span>タグ</span>
          <input
            type="text"
            value={tagsText}
            placeholder="subtitle,dolby"
            onChange={(event) => onTagsTextChange(event.target.value)}
          />
        </label>
        {extraContent}
      </div>
      <div className="field">
        <span>映画館</span>
        <div className="chip-grid">
          {theaters.length ? (
            theaters.map((theater) => {
              const checked = selectedTheaterIds.includes(theater.id);
              return (
                <label key={theater.id} className={checked ? "chip chip-active" : "chip"}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTheaterToggle(theater.id)}
                  />
                  <span>{theater.name}</span>
                </label>
              );
            })
          ) : (
            <span className="muted">映画館データがありません</span>
          )}
        </div>
      </div>
      <div className="actions">
        <button type="button" className="primary-button" onClick={onApply}>
          条件を反映
        </button>
      </div>
    </section>
  );
}
