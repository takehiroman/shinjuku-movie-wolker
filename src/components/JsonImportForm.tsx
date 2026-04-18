interface JsonImportFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function JsonImportForm({ value, onChange, onSubmit, loading }: JsonImportFormProps) {
  return (
    <section className="panel">
      <h2>上映JSONを取り込む</h2>
      <label className="field">
        <span>JSON payload</span>
        <textarea
          className="json-textarea"
          rows={18}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" className="primary-button" onClick={onSubmit} disabled={loading}>
          {loading ? "取り込み中..." : "D1へ取り込む"}
        </button>
      </div>
    </section>
  );
}
