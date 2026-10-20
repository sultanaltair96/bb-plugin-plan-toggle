// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test } from "vitest";
import { loadPluginApp, mountPluginContentScripts } from "@get-bb/plugin-sdk/testing/app";
import { registerToggleTarget } from "./bus";

let toggles: string[] = [];
let cleanups: Array<() => void> = [];
let dispose: () => Promise<void>;

function composer(name: string): HTMLElement {
  const box = document.createElement("div");
  box.setAttribute("data-promptbox", "");
  box.append(document.createElement("textarea"));
  document.body.append(box);
  cleanups.push(
    registerToggleTarget({ owns: (promptbox) => promptbox === box, toggle: () => toggles.push(name) }),
  );
  return box;
}

function key(type: "keydown" | "keyup", keyName: string, at: number) {
  const event = new KeyboardEvent(type, { key: keyName, bubbles: true });
  Object.defineProperty(event, "timeStamp", { value: at });
  window.dispatchEvent(event);
}
const tap = (down: number, up = down + 80) => {
  key("keydown", "Control", down);
  key("keyup", "Control", up);
};

beforeEach(async () => {
  toggles = [];
  document.body.innerHTML = "";
  Element.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
  const app = await loadPluginApp(() => import("./app"));
  const mounted = await mountPluginContentScripts(app, { pluginId: "plan-toggle", generation: 1 });
  dispose = () => mounted.lifecycle.dispose();
});
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  await dispose();
});

test("each Control tap toggles the composer", () => {
  composer("main");
  tap(1000);
  tap(2000);
  expect(toggles).toEqual(["main", "main"]);
});

test("Control combinations, long presses, and Control+click do nothing", () => {
  composer("main");
  key("keydown", "Control", 1000);
  key("keydown", "a", 1050);
  key("keyup", "Control", 1100);
  tap(2000, 2400);
  key("keydown", "Control", 3000);
  window.dispatchEvent(new Event("pointerdown"));
  key("keyup", "Control", 3080);
  key("keydown", "Control", 4000);
  window.dispatchEvent(new Event("blur"));
  key("keyup", "Control", 4080);
  expect(toggles).toEqual([]);
});

test("targets the focused composer", () => {
  composer("first");
  const second = composer("second");
  second.querySelector("textarea")!.focus();
  tap(1000);
  expect(toggles).toEqual(["second"]);
});

test("ignores taps while a dialog has focus", () => {
  composer("main");
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  const input = document.createElement("input");
  dialog.append(input);
  document.body.append(dialog);
  input.focus();
  tap(1000);
  expect(toggles).toEqual([]);
});

test("stops listening after dispose", async () => {
  composer("main");
  await dispose();
  dispose = async () => {};
  tap(1000);
  expect(toggles).toEqual([]);
});
