import { describe, expect, it } from "vitest";
import { buildUpdatedSettings } from "../domain/settings";

const theaters = [
  { id: "wald9", name: "新宿バルト9", area: "shinjuku", isActive: true },
  { id: "toho", name: "TOHOシネマズ新宿", area: "shinjuku", isActive: true },
];

describe("settings updates", () => {
  it("updates buffer minutes", () => {
    const next = buildUpdatedSettings(
      { bufferMinutes: 20, enabledTheaterIds: ["wald9", "toho"] },
      { bufferMinutes: 35, enabledTheaterIds: ["wald9", "toho"] },
      theaters,
    );

    expect(next.bufferMinutes).toBe(35);
  });

  it("updates enabled theaters", () => {
    const next = buildUpdatedSettings(
      { bufferMinutes: 20, enabledTheaterIds: ["wald9", "toho"] },
      { bufferMinutes: 20, enabledTheaterIds: ["wald9"] },
      theaters,
    );

    expect(next.enabledTheaterIds).toEqual(["wald9"]);
  });

  it("drops theater ids that no longer exist", () => {
    const next = buildUpdatedSettings(
      { bufferMinutes: 20, enabledTheaterIds: ["wald9", "missing-theater"] },
      { bufferMinutes: 20, enabledTheaterIds: ["wald9", "missing-theater"] },
      theaters,
    );

    expect(next.enabledTheaterIds).toEqual(["wald9"]);
  });
});
