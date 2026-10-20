// @vitest-environment jsdom
import { act } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { ComposerMention } from "@get-bb/plugin-sdk/app";
import { installTestPluginRuntime, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { requestToggle } from "./bus";
import { PlanToggle } from "./plan-toggle";

installTestPluginRuntime();

let promptbox: HTMLElement;
beforeEach(() => {
  promptbox = document.createElement("form");
  promptbox.setAttribute("data-promptbox", "");
  document.body.append(promptbox);
});
afterEach(() => {
  cleanup();
  promptbox.remove();
});

const planPill: ComposerMention = {
  from: 0,
  to: 5,
  label: "/plan",
  kind: "command",
  trigger: "/",
  name: "plan",
  source: "command",
  origin: "user",
  argumentHint: null,
};

const sonnet = { model: "claude-sonnet-5-5", reasoningLevel: "medium" };
const opus = { model: "claude-opus-5-5", reasoningLevel: "high" };

function render({
  text = "",
  mentions = [] as ComposerMention[],
  planMode = 0,
  providerActions = [{ kind: "plan" }] as unknown[],
  planModels = {} as Record<string, typeof opus>,
  current = sonnet as { model: string; reasoningLevel: string },
} = {}) {
  const cancelPlanCalls: unknown[] = [];
  const slot = renderSlot(
    { component: PlanToggle },
    {},
    {
      composer: {
        text,
        mentions,
        scope: { kind: "thread", threadId: "t1" },
        selection: { providerId: "claude-code", ...current },
      },
      rpc: { plan_models_get: () => ({ models: planModels }) },
      sidebarThreads: {
        status: "ready",
        threads: [{ id: "t1", providerId: "claude-code", activity: { planMode } }] as never,
      },
      providers: {
        status: "ready",
        providers: [{ id: "claude-code", composerActions: providerActions }] as never,
      },
      sdk: {
        threads: {
          cancelPlan: async (args: unknown) => {
            cancelPlanCalls.push(args);
            return {} as never;
          },
        },
      },
    },
  );
  return { slot, cancelPlanCalls };
}

/** Toggle, then let model switches and plan-model loading settle. */
const toggle = async () => {
  act(() => void requestToggle(promptbox));
  await act(async () => {});
};
const settle = () => act(async () => {});

beforeEach(() => localStorage.clear());

test("Build → Plan: stages bb's /plan command", async () => {
  const { slot } = render({ text: "fix the bug" });
  await toggle();
  expect(slot.inspection.composer.text).toBe("/plan fix the bug");
  expect(slot.inspection.composer.draft.mentions[0]).toMatchObject({ kind: "command", name: "plan" });
});

test("staged Plan → Build: removes the /plan command", async () => {
  const { slot } = render({ text: "/plan fix the bug", mentions: [planPill] });
  await toggle();
  expect(slot.inspection.composer.text).toBe("fix the bug");
  expect(slot.inspection.composer.draft.mentions).toEqual([]);
});

test("thread in Plan mode → Build: exits Plan mode", async () => {
  const { slot, cancelPlanCalls } = render({ text: "next step", planMode: 1 });
  await toggle();
  await act(async () => {});
  expect(cancelPlanCalls).toEqual([{ threadId: "t1" }]);
  expect(slot.inspection.composer.text).toBe("next step");
});

test("does nothing for an agent without Plan mode", async () => {
  const { slot } = render({ text: "fix the bug", providerActions: [] });
  await toggle();
  expect(slot.inspection.composer.text).toBe("fix the bug");
});

test("toggling twice returns to Build", async () => {
  const { slot } = render({ text: "fix the bug" });
  await toggle();
  await toggle();
  expect(slot.inspection.composer.text).toBe("fix the bug");
});

test("ignores composers it does not own when several are on screen", async () => {
  const { slot } = render({ text: "fix the bug" });
  const other = renderSlot({ component: PlanToggle }, {}, { composer: { text: "other" } });
  const elsewhere = document.createElement("div");
  elsewhere.setAttribute("data-promptbox", "");
  act(() => void requestToggle(elsewhere));
  await settle();
  expect(slot.inspection.composer.text).toBe("fix the bug");
  expect(other.inspection.composer.text).toBe("other");
  other.lifecycle.unmount();
});

test("entering Plan switches to the plan model; leaving switches back", async () => {
  const { slot } = render({ text: "fix the bug", planModels: { "claude-code": opus } });
  await settle();
  await toggle();
  expect(slot.inspection.composer.selections).toEqual([opus]);
  await toggle();
  expect(slot.inspection.composer.selections).toEqual([opus, sonnet]);
  expect(slot.inspection.composer.text).toBe("fix the bug");
});

test("without a plan model, Plan keeps the current model", async () => {
  const { slot } = render({ text: "fix the bug" });
  await settle();
  await toggle();
  await toggle();
  expect(slot.inspection.composer.selections).toEqual([]);
});

test("already on the plan model: nothing to switch", async () => {
  const { slot } = render({ text: "x", planModels: { "claude-code": opus }, current: opus });
  await settle();
  await toggle();
  expect(slot.inspection.composer.text).toBe("/plan x");
  expect(slot.inspection.composer.selections).toEqual([]);
});

test("exiting an active Plan mode returns to the remembered build model", async () => {
  localStorage.setItem(
    "bb-plugin-plan-toggle:build-models",
    JSON.stringify({ "thread:t1": sonnet }),
  );
  const { slot, cancelPlanCalls } = render({
    planMode: 1,
    planModels: { "claude-code": opus },
    current: opus,
  });
  await settle();
  await toggle();
  expect(cancelPlanCalls).toEqual([{ threadId: "t1" }]);
  expect(slot.inspection.composer.selections).toEqual([sonnet]);
});

test("a model picked by hand during Plan is left alone on exit", async () => {
  localStorage.setItem(
    "bb-plugin-plan-toggle:build-models",
    JSON.stringify({ "thread:t1": sonnet }),
  );
  const fable = { model: "claude-fable-5-1", reasoningLevel: "high" };
  const { slot } = render({ planMode: 1, planModels: { "claude-code": opus }, current: fable });
  await settle();
  await toggle();
  expect(slot.inspection.composer.selections).toEqual([]);
});
