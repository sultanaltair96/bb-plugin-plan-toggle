// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { matchesToggleKey, parseToggleKeySetting, resolveToggleKey } from "./keys";

afterEach(() => vi.unstubAllGlobals());

function onPlatform(platform: string) {
  vi.stubGlobal("navigator", { platform, userAgent: "" });
}

test("automatic: either Control on Mac, left Ctrl on Windows and Linux", () => {
  onPlatform("MacIntel");
  expect(resolveToggleKey("auto")).toBe("Control");
  onPlatform("Win32");
  expect(resolveToggleKey("auto")).toBe("ControlLeft");
  onPlatform("Linux x86_64");
  expect(resolveToggleKey("auto")).toBe("ControlLeft");
});

test("unknown stored values fall back to automatic", () => {
  expect(parseToggleKeySetting("Shift")).toBe("auto");
  expect(parseToggleKeySetting("ControlRight")).toBe("ControlRight");
});

test("matches by side, with or without a physical key code", () => {
  const event = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
  expect(matchesToggleKey(event({ key: "Control", code: "ControlRight" }), "Control")).toBe(true);
  expect(matchesToggleKey(event({ key: "Control", code: "ControlRight" }), "ControlLeft")).toBe(false);
  expect(matchesToggleKey(event({ key: "Control", location: 1 }), "ControlLeft")).toBe(true);
  expect(matchesToggleKey(event({ key: "Shift", code: "ShiftLeft" }), "Control")).toBe(false);
});
