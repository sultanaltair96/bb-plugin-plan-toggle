// Plan model choices (from the settings page) and the build model to return
// to when Plan mode ends.
import { useCallback, useEffect, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { PluginComposerApi } from "@get-bb/plugin-sdk/app";
import { PLAN_MODELS_CHANGED } from "./channels";
import type { ModelSelection, PlanModels, rpcContract } from "./server";

export function usePlanModels() {
  const rpc = useRpc<typeof rpcContract>();
  const [models, setModels] = useState<PlanModels | null>(null);
  const refetch = useCallback(() => {
    rpc.call("plan_models_get", null).then(
      (result) => setModels(result.models),
      (error: unknown) => console.warn("[plan-toggle] could not load plan models", error),
    );
  }, [rpc]);
  useEffect(refetch, [refetch]);
  useRealtime(PLAN_MODELS_CHANGED, refetch);
  const setModel = useCallback(
    async (providerId: string, selection: ModelSelection | null) => {
      const result = await rpc.call("plan_model_set", { providerId, selection });
      setModels(result.models);
    },
    [rpc],
  );
  return { models, setModel };
}

export function currentSelection(composer: PluginComposerApi): ModelSelection | null {
  const { model, reasoningLevel, serviceTier } = composer.selection ?? {};
  if (!model || !reasoningLevel) return null;
  return serviceTier ? { model, reasoningLevel, serviceTier } : { model, reasoningLevel };
}

function isSame(a: ModelSelection, b: ModelSelection): boolean {
  return a.model === b.model && a.reasoningLevel === b.reasoningLevel;
}

// The build model is remembered per thread, with a per-agent fallback for
// threads started from the new-thread composer. localStorage keeps it across
// reloads of this window.
const BUILD_STORAGE_KEY = "bb-plugin-plan-toggle:build-models";

function readBuildModels(): Record<string, ModelSelection> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(BUILD_STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, ModelSelection] => {
        const value = entry[1] as Partial<ModelSelection> | null;
        return typeof value?.model === "string" && typeof value.reasoningLevel === "string";
      },
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function writeBuildModels(models: Record<string, ModelSelection>): void {
  try {
    localStorage.setItem(BUILD_STORAGE_KEY, JSON.stringify(models));
  } catch {
    // Storage full or blocked: Plan mode still works, the model just is not restored.
  }
}

export interface ModelSwitchTarget {
  composer: PluginComposerApi;
  providerId: string | undefined;
  threadId: string | null;
  planModels: PlanModels | null;
}

function memoryKeys({ providerId, threadId }: ModelSwitchTarget): string[] {
  return [threadId ? `thread:${threadId}` : null, providerId ? `provider:${providerId}` : null].filter(
    (key): key is string => key !== null,
  );
}

function setSelection(composer: PluginComposerApi, selection: ModelSelection): Promise<boolean> {
  return composer.setSelection(selection).then(
    () => true,
    (error: unknown) => {
      console.warn("[plan-toggle] could not switch model", error);
      return false;
    },
  );
}

/** Switches to the agent's plan model, remembering the build model. False when nothing changed. */
export async function switchToPlanModel(target: ModelSwitchTarget): Promise<boolean> {
  const plan = target.providerId ? target.planModels?.[target.providerId] : undefined;
  const current = currentSelection(target.composer);
  if (!plan || !current || isSame(current, plan)) return false;
  const saved = readBuildModels();
  for (const key of memoryKeys(target)) saved[key] = current;
  writeBuildModels(saved);
  return setSelection(target.composer, plan);
}

/**
 * Switches back to the remembered build model, but only while the composer is
 * still on the plan model: a model picked by hand during Plan is left alone.
 */
export async function switchToBuildModel(target: ModelSwitchTarget): Promise<boolean> {
  const plan = target.providerId ? target.planModels?.[target.providerId] : undefined;
  const current = currentSelection(target.composer);
  if (!plan || !current || !isSame(current, plan)) return false;
  const saved = readBuildModels();
  const build = memoryKeys(target)
    .map((key) => saved[key])
    .find((selection) => selection !== undefined);
  if (!build) return false;
  const switched = await setSelection(target.composer, build);
  if (switched && target.threadId) {
    delete saved[`thread:${target.threadId}`];
    writeBuildModels(saved);
  }
  return switched;
}
