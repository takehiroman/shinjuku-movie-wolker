# Shinjuku Movie Wolker

新宿の映画館を横断して上映スケジュールを時系列表示し、同日に梯子可能な2本の組み合わせを探せる Cloudflare 向けMVPです。  
MVPでは外部スクレイピングを必須にせず、JSONインポートで D1 に上映データを投入して動かします。

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
- `src/jobs` / `src/adapters`: Cron から将来のスクレイピング更新へ拡張する雛形

## キャッシュ方針

- `screenings:{date}:{hash(filters)}`
- `itineraries:{date}:{bufferMinutes}:{hash(filters)}`
- `settings:default`

GET系はまず KV を参照し、ヒットしなければ D1 を読み、結果を KV に保存します。  
インポート時と設定更新時は関連 prefix をまとめて削除します。

## 今後の拡張ポイント

- 実映画館ごとの adapter 実装と Cron 更新
- 3本以上の梯子最適化
- 作品詳細、タグ整備、並び順プリセット
- 認証付き管理画面
- より細かいキャッシュ無効化
- Pages プロジェクト分離やCI/CDの追加
