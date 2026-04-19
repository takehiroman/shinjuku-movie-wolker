# Shinjuku Movie Wolker

新宿の映画館を横断して上映スケジュールを時系列表示し、同日に梯子可能な2本の組み合わせを探せる Cloudflare 向けMVPです。  
MVPでは JSON インポートで D1 に上映データを投入して動かせることを基本にしつつ、Cron による自動取得の土台も入れています。

現在の自動取得対象:

- 新宿バルト9
- 新宿ピカデリー
- TOHOシネマズ新宿

## ディレクトリ構成

```text
/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.jsonc
├── README.md
├── .dev.vars.example
├── migrations/
├── public/
├── sample-data/
└── src/
    ├── app/
    ├── pages/
    ├── components/
    ├── lib/
    ├── domain/
    ├── services/
    ├── adapters/
    ├── api/
    ├── db/
    ├── jobs/
    ├── cache/
    └── test/
```

### 役割の見方

- `migrations/`
  D1 のスキーマ変更を管理します。初期テーブル定義や index 追加はここに入れます。
- `public/`
  Vite がそのまま配信する静的ファイルを置きます。
- `sample-data/`
  管理画面 import やローカル検証に使う seed データを置きます。
- `src/app/`
  React アプリのエントリーポイントです。ルーティング定義やアプリ全体の起点を持ちます。
- `src/pages/`
  画面単位のコンテナです。データ取得や画面状態の組み立てを担当します。
- `src/components/`
  ページから使う再利用可能な UI 部品です。表示責務を中心に持たせています。
- `src/lib/`
  日付、ハッシュ、定数、軽量バリデーションなどの共通ユーティリティです。
- `src/domain/`
  `Screening`、`Itinerary`、`Settings` など UI 非依存の型と純関数を置きます。梯子判定のような中心ロジックはここを基準にします。
- `src/services/`
  ユースケース層です。repo から読んだデータに対して絞り込み、並び替え、キャッシュ処理を適用して返します。
- `src/adapters/`
  映画館ごとの取得差分を吸収する層です。外部サイトや PDF を `ImportPayload` に正規化します。
- `src/api/`
  Cloudflare Worker の HTTP 入口です。ルーターと各 API ハンドラをまとめています。
- `src/db/`
  D1 クライアント、テーブル構造、repository を管理します。repository では SQL 実行に責務を寄せています。
- `src/jobs/`
  Cron から起動するバッチ処理です。各 adapter を順に回して同期を行います。
- `src/cache/`
  KV キーの命名規則をまとめる層です。
- `src/test/`
  Vitest による最低限のユニットテストです。判定ロジックや絞り込み、設定更新を検証します。

### レイヤー分離の意図

- `api` は HTTP の入出力だけに寄せ、業務判断は `services` と `domain` に逃がしています。
- `db/repositories` には判定ロジックを持たせず、SQL とデータ整形に集中させています。
- `adapters` は外部ソース依存を閉じ込め、上映取得方式が変わっても UI や API に波及しにくくしています。
- `pages` と `components` を分けることで、画面状態と表示部品の責務を分離しています。

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

- フロントは Vite + React の SPA とし、`/api/*` だけを Worker が処理します
- 取得ロジックは映画館ごとに adapter を分け、正規化後は共通の `ImportPayload` に揃えています
- 梯子判定は UI から切り離した純関数として保持し、今後 3 本以上への拡張余地を残しています
- 自動同期は theater 単位の差分更新、管理画面 import は全体置換という役割分担にしています

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
