import { describe, expect, it } from "vitest";
import { normalizePiccadillyHtml } from "../adapters/piccadillyAdapter";
import { normalizeTohoSchedule } from "../adapters/tohoShinjukuAdapter";
import { normalizeWald9Html, normalizeWald9PdfText } from "../adapters/wald9Adapter";

describe("scraping adapters", () => {
  it("normalizes Wald9 schedule cards", () => {
    const html = `
      <div class="card-header bg-white pb-3 pl-3 film-item d-flex js-card-click" data-target="#film-C4759000">
        <span class="badge-pc d-inline-block badge rounded-0 lb-icon lb-rate-dub float-left mr-1">字幕</span>
        <h5 class="js-title-film font-weight-bold pt-2 mb-0">【字幕】OCHI！-オチ-</h5>
        <p class="mb-0 time-film d-flex align-items-center">（本編：96分）</p>
        <div class="panel">
          <ul class="row mb-0 theater align-items-stretch">
            <li class="schedule-box theater-item d-flex flex-column mb-sm-3">
              <div class="theater-name mb-1 d-none d-sm-block">
                <a class="" data-toggle="modal" data-target="#screen07">シアター７</a>
              </div>
              <div class="schedule-box-body d-flex flex-sm-column flex-row align-items-center justify-content-between">
                <div class="box-time" data-toggle="modal" data-target="#screen07">
                  <p class="schedule-time mb-0">22:15 <span>～ 24:25</span></p>
                  <div class="d-flex justify-content-start justify-content-md-center d-flex align-items-center text-center mb-2">
                    <a href="javascript:void(0);" class="theater-btn d-inline-block rounded-0 align-items-center">レイトショー</a>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    `;

    const payload = normalizeWald9Html(html, "2026-04-18");

    expect(payload.theaters[0].id).toBe("wald9");
    expect(payload.movies[0].title).toBe("OCHI！-オチ-");
    expect(payload.screenings).toHaveLength(1);
    expect(payload.screenings[0]?.screenName).toBe("シアター７");
    expect(payload.screenings[0]?.startAt).toBe("2026-04-18T22:15:00+09:00");
    expect(payload.screenings[0]?.endAt).toBe("2026-04-19T00:25:00+09:00");
    expect(payload.screenings[0]?.tags).toEqual(["subtitle", "late"]);
  });

  it("normalizes Wald9 schedule pdf text", () => {
    const payload = normalizeWald9PdfText(
      [
        "4/20（月）上映スケジュール",
        "08:00開館",
        "【DolbyCinema】名探偵コナン ハイウェイの堕天使（116分）",
        "08:30～10:4011:05～13:15",
        "シアター６シアター６",
        "通常レイトショー",
        "【字幕】ダーティ・エンジェルズ[R15+]（104分）",
        "10:25～12:20",
        "シアター４",
        "通常",
      ],
      "2026-04-20",
    );

    expect(payload.theaters[0].id).toBe("wald9");
    expect(payload.movies.map((movie) => movie.title)).toEqual([
      "名探偵コナン ハイウェイの堕天使",
      "ダーティ・エンジェルズ",
    ]);
    expect(payload.screenings).toHaveLength(3);
    expect(payload.screenings[0]?.tags).toEqual(["dolby-cinema"]);
    expect(payload.screenings[1]?.tags).toEqual(["dolby-cinema", "late"]);
    expect(payload.screenings[2]?.tags).toEqual(["subtitle", "r15+"]);
    expect(payload.screenings[1]?.endAt).toBe("2026-04-20T13:15:00+09:00");
  });

  it("normalizes Piccadilly daily schedule fragments", () => {
    const html = `
      <section class="47406 T0031980">
        <div class="list">
          <div class="movieTitle">
            <div class="inner clearfix">
              <h2>【字幕】人はなぜラブレターを書くのか（本編：122分）</h2>
              <p class="tag">
                <span>バリアフリー</span>
                <span class="new">NEW</span>
              </p>
            </div>
          </div>
          <div class="theaterList clearfix">
            <div class="clearfix">
              <div class="select matchHeight clearfix">
                <div class="block ng">
                  <h3><a href="javascript:void(0)" class="T1051S03">シアター３</a></h3>
                  <div class="inner ng" id="0_1051_47406_20260418_1_03_0">
                    <p class="time">
                      <span>8:35～</span>
                      10:50
                    </p>
                  </div>
                </div>
                <div class="block ng">
                  <h3><a href="javascript:void(0)" class="T1051S09">シアター９</a></h3>
                  <div class="inner ng" id="0_1051_47406_20260418_6_09_0">
                    <p class="time">
                      <span>21:40～</span>
                      23:55
                    </p>
                  </div>
                </div>
              </div>
              <span class="next matchHeight" id="1051_20260419">翌日</span>
            </div>
          </div>
        </div>
      </section>
    `;

    const payload = normalizePiccadillyHtml(html, "2026-04-18");

    expect(payload.theaters[0].id).toBe("piccadilly");
    expect(payload.movies[0].title).toBe("人はなぜラブレターを書くのか");
    expect(payload.screenings).toHaveLength(2);
    expect(payload.screenings[0]?.screenName).toBe("シアター３");
    expect(payload.screenings[0]?.tags).toEqual(["subtitle", "accessible"]);
    expect(payload.screenings[1]?.startAt).toBe("2026-04-18T21:40:00+09:00");
    expect(payload.screenings[1]?.endAt).toBe("2026-04-18T23:55:00+09:00");
  });

  it("normalizes TOHO Shinjuku schedule API responses", () => {
    const payload = normalizeTohoSchedule(
      {
        status: "0",
        data: [
          {
            list: [
              {
                name: "ＴＯＨＯシネマズ新宿",
                list: [
                  {
                    name: "名探偵コナン　ハイウェイの堕天使（ＩＭＡＸレーザー）",
                    ratingCd: "01",
                    hours: 109,
                    list: [
                      {
                        ename: "SCREEN10",
                        name: "スクリーン１０",
                        iconNm1: "",
                        iconNm2: "IMAXレーザー",
                        iconNm3: "",
                        facilities: [],
                        list: [
                          {
                            code: 1,
                            showingStart: "9:00",
                            showingEnd: "11:10",
                            eventIcon: "",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: "私がビーバーになる時（吹替版）",
                    ratingCd: "",
                    hours: 104,
                    list: [
                      {
                        ename: "SCREEN11",
                        name: "スクリーン１１",
                        iconNm1: "",
                        iconNm2: "",
                        iconNm3: "",
                        facilities: [],
                        list: [
                          {
                            code: 7,
                            showingStart: "21:35",
                            showingEnd: "23:35",
                            eventIcon: "/schedule/schedule_ico02-4.gif",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      "2026-04-18",
    );

    expect(payload.theaters[0].id).toBe("toho-shinjuku");
    expect(payload.screenings).toHaveLength(2);
    expect(payload.movies.map((movie) => movie.title)).toEqual([
      "名探偵コナン ハイウェイの堕天使",
      "私がビーバーになる時",
    ]);
    expect(payload.screenings[0]?.tags).toEqual(["imax-laser", "pg12", "imax"]);
    expect(payload.screenings[1]?.tags).toEqual(["dub", "midnight"]);
    expect(payload.screenings[1]?.startAt).toBe("2026-04-18T21:35:00+09:00");
    expect(payload.screenings[1]?.endAt).toBe("2026-04-18T23:35:00+09:00");
    expect(payload.screenings[0]?.bookingUrl).toBe(
      "https://hlo.tohotheater.jp/net/ticket/076/TNPI3070J01.do?site_cd=076&jiz_cd=TNPI3050J02&show_cd=1&fnc=1",
    );
    expect(payload.screenings[1]?.bookingUrl).toBe(
      "https://hlo.tohotheater.jp/net/ticket/076/TNPI3070J01.do?site_cd=076&jiz_cd=TNPI3050J02&show_cd=7&fnc=1",
    );
  });
});
