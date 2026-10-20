import { expect, test } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "./server";

const opus = { model: "claude-opus-5-5", reasoningLevel: "high" };

async function load() {
  const { bb, harness } = createFakePluginHost();
  await plugin(bb);
  return harness;
}

test("starts with no plan models", async () => {
  const harness = await load();
  expect(await harness.callRpc("plan_models_get", null)).toEqual({ models: {} });
});

test("sets, reads back, and clears a plan model, signalling each change", async () => {
  const harness = await load();
  expect(
    await harness.callRpc("plan_model_set", { providerId: "claude-code", selection: opus }),
  ).toEqual({ models: { "claude-code": opus } });
  expect(await harness.callRpc("plan_models_get", null)).toEqual({ models: { "claude-code": opus } });
  expect(
    await harness.callRpc("plan_model_set", { providerId: "claude-code", selection: null }),
  ).toEqual({ models: {} });
  expect(harness.realtimeSignals.map((signal) => signal.channel)).toEqual([
    "plan-models-changed",
    "plan-models-changed",
  ]);
});

test("rejects an empty model", async () => {
  const harness = await load();
  await expect(
    harness.callRpc("plan_model_set", {
      providerId: "claude-code",
      selection: { model: "", reasoningLevel: "high" },
    }),
  ).rejects.toThrow();
});
