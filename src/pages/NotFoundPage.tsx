import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      title="ページが見つかりません"
      description="ナビゲーションから目的のページを開いてください。"
    />
  );
}
