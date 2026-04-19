# Shinjuku Movie Wolker

新宿の映画館を横断して上映スケジュールを時系列表示し、同日に梯子可能な2本の組み合わせを探せる Cloudflare 向けMVPです。  
MVPでは JSON インポートで D1 に上映データを投入して動かせることを基本にしつつ、Cron による自動取得の土台も入れています。

現在の自動取得対象:

- 新宿バルト9
- 新宿ピカデリー
- TOHOシネマズ新宿

## セットアップ手順

1. Node.js 20 以上を用意します。
2. 依存関係をインストールします。

```bash
npm install
```

3. `.dev.vars.example` を参考に `.dev.vars` を作成します。

```bash
cp .dev.vars.example .dev.vars
```

Cloudflare Web Analytics を手動スニペットで使う場合は、Vite 用の `.env.local` か `.env.production.local` に `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` を設定してください。  
未設定なら beacon は読み込まれません。

4. `wrangler.jsonc` の `database_id` と `kv_namespaces` を実環境のIDに置き換えます。

## D1 migration の流し方

ローカル:

```bash
npm run d1:migrate:local
```

リモート:

```bash
npm run d1:migrate:remote
```

手動コマンド例:

```bash
wrangler d1 migrations apply shinjuku-movie-wolker --local
wrangler d1 migrations apply shinjuku-movie-wolker --remote
```

## KV の作成方法

```bash
wrangler kv namespace create CACHE
wrangler kv namespace create CACHE --preview
```

作成後に出力される `id` と `preview_id` を `wrangler.jsonc` に設定してください。

## ローカル起動方法

フロントエンド:

```bash
npm run dev
```

API Worker:

```bash
npm run dev:api
```

デフォルトでは Vite が `/api` を `http://127.0.0.1:8787` にプロキシします。

Cron を含めた Worker 側のローカル確認:

```bash
npm run dev:api
```

JST 朝 06:00 実行の Cron は `wrangler.jsonc` では UTC 21:00 として設定しています。

## デプロイ方法

ビルド:

```bash
npm run build
```

Worker + static assets を Cloudflare にデプロイ:

```bash
wrangler deploy
```

この構成では、SPA のビルド成果物 `dist/` を static assets として配信し、 `/api/*` を Worker で処理します。

## Web Analytics の有効化

Cloudflare Web Analytics は無料枠で利用できます。  
このリポジトリでは、`VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` が設定されている場合だけ、Cloudflare の beacon を読み込むようにしています。

1. Cloudflare ダッシュボードの Web Analytics で site を追加します。
2. 対象ホスト名を登録します。
   現在の公開先をそのまま計測するなら `shinjuku-movie-wolker.zakimoto.workers.dev` を使います。
3. 発行された site token を `.env.production.local` などのビルド時環境変数として `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` に設定します。
4. 再ビルド・再デプロイします。

例:

```bash
echo "VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN=your-site-token" >> .env.production.local
npm run build
wrangler deploy
```

手動スニペット方式なので、Workers + Assets 構成でも有効化できます。  
Cloudflare 公式の RUM beacon は SPA の route change も送信対象です。

## 自動更新の仕組み

- `src/jobs/updateScreenings.ts` が Cron から起動されます
- `src/adapters/wald9Adapter.ts` は翌日上映PDFを取得して正規化します
- `src/adapters/piccadillyAdapter.ts` と `src/adapters/tohoShinjukuAdapter.ts` は翌日上映を取得します
- 正規化結果は `ImportPayload` に変換され、D1 に劇場単位で反映されます
- 更新後に `screenings` / `itineraries` / `settings` の KV キャッシュを削除します

手動で今すぐ同期したい場合は、環境変数 `ADMIN_SYNC_TOKEN` を設定したうえで `POST /api/admin/run-sync` を利用できます。  
ヘッダー `x-admin-token: <token>` が一致した場合のみ実行されます。

自動更新は「劇場単位の差分更新」、管理画面の JSON import は「全体置換」です。  
そのため、手動 import をフォールバックとして残しつつ、自動化を段階導入できます。

## JSON import のサンプル形式

```json
{
  "theaters": [
    { "id": "wald9", "name": "新宿バルト9", "area": "shinjuku" },
    { "id": "toho-shinjuku", "name": "TOHOシネマズ新宿", "area": "shinjuku" }
  ],
  "movies": [
    { "id": "movie-1", "title": "映画A" },
    { "id": "movie-2", "title": "映画B" }
  ],
  "screenings": [
    {
      "id": "scr-1",
      "theaterId": "wald9",
      "movieId": "movie-1",
      "screenName": "SCREEN1",
      "startAt": "2026-04-18T09:00:00+09:00",
      "endAt": "2026-04-18T11:10:00+09:00",
      "durationMinutes": 130,
      "tags": ["subtitle"],
      "targetDate": "2026-04-18"
    }
  ],
  "travelTimes": [
    {
      "fromTheaterId": "wald9",
      "toTheaterId": "toho-shinjuku",
      "travelMinutes": 12
    }
  ]
}
```

実運用寄りのデモデータは [sample-data/shinjuku-demo-2026-04-18.json](/Users/takehirotsuzaki/shinjuku-movie-wolker/sample-data/shinjuku-demo-2026-04-18.json) に置いてあります。

主要館だけに絞った軽い seed は [sample-data/shinjuku-core-2026-04-18.json](/Users/takehirotsuzaki/shinjuku-movie-wolker/sample-data/shinjuku-core-2026-04-18.json) に置いてあります。

管理画面からすぐ読み込める公開プリセットも配置しています。

- `/seed-presets/shinjuku-core-2026-04-18.json`
- `/seed-presets/shinjuku-demo-2026-04-18.json`

映画館ごとに JSON を分けて管理したい場合は、[sample-data/sources/core-2026-04-18](/Users/takehirotsuzaki/shinjuku-movie-wolker/sample-data/sources/core-2026-04-18) 配下の `theaters/*.json` と `travel-times.json` を編集し、次を実行してください。

```bash
npm run seed:build:core
```

これで import 用の統合ファイル `sample-data/shinjuku-core-2026-04-18.json` を再生成できます。

## 主要API

- `GET /api/screenings?date=2026-04-18&theaterIds=wald9,toho&keyword=映画A&tags=subtitle`
- `GET /api/itineraries?date=2026-04-18&bufferMinutes=20&startScreeningId=scr-1`
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/admin/import-screenings`

## テスト

```bash
npm run test
```

含まれる最低限のテスト:

- 梯子判定
- 上映フィルタ
- 設定更新

## 実装メモ

- `src/domain`: UIに依存しない型と純関数
- `src/db/repositories`: SQL とデータ入出力
- `src/services`: キャッシュを含むユースケース
- `src/api`: Worker API のルーティングとハンドラ
- `src/pages` / `src/components`: SPA UI
- `src/jobs` / `src/adapters`: Cron からの上映自動取得と将来の館追加拡張

## キャッシュ方針

- `screenings:{date}:{hash(filters)}`
- `itineraries:{date}:{bufferMinutes}:{hash(filters)}`
- `settings:default`

GET系はまず KV を参照し、ヒットしなければ D1 を読み、結果を KV に保存します。  
インポート時と設定更新時は関連 prefix をまとめて削除します。

## 今後の拡張ポイント

- 取得対象日を「当日 + 翌日」に広げる
- 週末のみ昼再取得する Cron の追加
- 3本以上の梯子最適化
- 作品詳細、タグ整備、並び順プリセット
- 認証付き管理画面
- より細かいキャッシュ無効化
- Pages プロジェクト分離やCI/CDの追加
