// Mounted once per thread and new-thread composer (as an invisible banner).
// Owns the Plan/Build toggle for that composer, including the switch to the
// agent's plan model and back.
import { useEffect, useRef } from "react";
import {
  experimental_useProviders,
  experimental_useSidebarThreads,
  useComposer,
  useSdk,
} from "@get-bb/plugin-sdk/app";
import { registerToggleTarget } from "./bus";
import { hasPlanCommand, withPlanCommand, withoutPlanCommand } from "./draft";
import { PROMPTBOX } from "./keyboard";
import { switchToBuildModel, switchToPlanModel, usePlanModels } from "./plan-models";

/**
 * Banners render just before their composer, outside its form element, so
 * the nearest ancestor that contains a composer contains this one.
 */
function ownPromptbox(marker: Element | null): Element | null {
  for (let element = marker?.parentElement; element; element = element.parentElement) {
    const promptbox = element.querySelector(PROMPTBOX);
    if (promptbox) return promptbox;
  }
  return null;
}

export function PlanToggle() {
  const composer = useComposer();
  const sdk = useSdk();
  const { threads } = experimental_useSidebarThreads();
  const { providers, status: providersStatus } = experimental_useProviders();
  const { models: planModels } = usePlanModels();
  const marker = useRef<HTMLSpanElement>(null);

  const threadId = composer.scope.kind === "thread" ? composer.scope.threadId : null;
  const thread = threadId ? threads.find((candidate) => candidate.id === threadId) : undefined;
  const providerId = composer.selection?.providerId ?? thread?.providerId;
  const provider = providers.find((candidate) => candidate.id === providerId);
  // Unknown while loading: let bb decide rather than ignoring the key.
  const supportsPlan =
    providersStatus !== "ready" || !provider
      ? true
      : provider.composerActions.some((action) => action.kind === "plan");
  const inPlanMode = (thread?.activity.planMode ?? 0) > 0;

  const latest = useRef({ composer, sdk, threadId, providerId, planModels, inPlanMode, supportsPlan });
  latest.current = { composer, sdk, threadId, providerId, planModels, inPlanMode, supportsPlan };
  /** The new-thread composer is on the plan model because of this plugin. */
  const newThreadOnPlanModel = useRef(false);

  useEffect(
    () =>
      registerToggleTarget({
        owns: (promptbox) => ownPromptbox(marker.current) === promptbox,
        toggle: () => {
          const { composer, sdk, threadId, inPlanMode, supportsPlan } = latest.current;
          if (hasPlanCommand(composer.draft)) {
            composer.replace(withoutPlanCommand);
            newThreadOnPlanModel.current = false;
            void switchToBuildModel(latest.current);
          } else if (inPlanMode && threadId) {
            sdk.threads
              .cancelPlan({ threadId })
              .catch((error: unknown) =>
                console.warn("[plan-toggle] could not exit Plan mode", error),
              );
            void switchToBuildModel(latest.current);
          } else if (supportsPlan) {
            composer.replace(withPlanCommand);
            void switchToPlanModel(latest.current).then((switched) => {
              if (switched && !latest.current.threadId) newThreadOnPlanModel.current = true;
            });
          } else {
            return;
          }
          composer.focus();
        },
      }),
    [],
  );

  // Plan mode ended without the toggle (the plan was approved, or exited from
  // the card): return to the build model for the next message.
  const wasInPlanMode = useRef(inPlanMode);
  useEffect(() => {
    if (wasInPlanMode.current && !inPlanMode) void switchToBuildModel(latest.current);
    wasInPlanMode.current = inPlanMode;
  }, [inPlanMode]);

  // A plan request sent from the new-thread composer starts its thread on the
  // plan model; put the new-thread defaults back for the next thread.
  useEffect(
    () =>
      composer.onSubmitted(() => {
        if (!newThreadOnPlanModel.current) return;
        newThreadOnPlanModel.current = false;
        void switchToBuildModel(latest.current);
      }),
    [composer],
  );

  return <span ref={marker} hidden />;
}
