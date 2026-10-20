// @vitest-environment jsdom
import { act } from "react";
import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { installTestPluginRuntime, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { PlanModelsSettings } from "./settings-section";

installTestPluginRuntime();
afterEach(cleanup);

const opus = { model: "claude-opus-5-5", reasoningLevel: "high" };

function render(initial: Record<string, typeof opus> = {}) {
  let models = { ...initial };
  const sets: unknown[] = [];
  const slot = renderSlot(
    { component: PlanModelsSettings },
    {},
    {
      providers: {
        status: "ready",
        providers: [
          { id: "claude-code", displayName: "Claude Code", composerActions: [{ kind: "plan" }] },
          { id: "pi", displayName: "Pi", composerActions: [] },
        ] as never,
      },
      rpc: {
        plan_models_get: () => ({ models }),
        plan_model_set: (input: { providerId: string; selection: typeof opus | null }) => {
          sets.push(input);
          models = { ...models };
          if (input.selection) models[input.providerId] = input.selection;
          else delete models[input.providerId];
          return { models };
        },
      },
      sdk: {
        providers: {
          models: async () =>
            ({
              modelLoadError: null,
              models: [
                { id: "claude-sonnet-5-5", model: "claude-sonnet-5-5", isDefault: false, defaultReasoningEffort: "high" },
                { id: "claude-haiku-5-5", model: "claude-haiku-5-5", isDefault: true, defaultReasoningEffort: "high" },
              ],
            }) as never,
        },
      },
    },
  );
  return { slot, sets };
}

test("lists only agents with Plan mode, defaulting to the current model", async () => {
  const { slot } = render();
  await act(async () => {});
  expect(slot.getByText("Claude Code")).toBeTruthy();
  expect(slot.queryByText("Pi")).toBeNull();
  const same = slot.getByLabelText("Same as the thread's current model") as HTMLInputElement;
  expect(same.checked).toBe(true);
});

test("choosing a dedicated plan model starts from the agent's default model", async () => {
  const { slot, sets } = render();
  await act(async () => {});
  fireEvent.click(slot.getByLabelText("A dedicated plan model"));
  await act(async () => {});
  expect(sets).toEqual([
    { providerId: "claude-code", selection: { model: "claude-haiku-5-5", reasoningLevel: "high" } },
  ]);
  expect((slot.getByLabelText("A dedicated plan model") as HTMLInputElement).checked).toBe(true);
});

test("switching back to the current model clears the plan model", async () => {
  const { slot, sets } = render({ "claude-code": opus });
  await act(async () => {});
  fireEvent.click(slot.getByLabelText("Same as the thread's current model"));
  await act(async () => {});
  expect(sets).toEqual([{ providerId: "claude-code", selection: null }]);
});
