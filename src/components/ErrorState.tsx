interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <section className="panel empty-state">
      <h2>エラーが発生しました</h2>
      <p className="muted">{message}</p>
    </section>
  );
}
