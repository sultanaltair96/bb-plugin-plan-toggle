// Plugin settings page: choose a plan model per agent.
import { useState } from "react";
import {
  experimental_ProviderModelPicker as ProviderModelPicker,
  experimental_useProviders,
  useSdk,
} from "@get-bb/plugin-sdk/app";
import type { ModelSelection } from "./server";
import { usePlanModels } from "./plan-models";

type ProviderInfo = ReturnType<typeof experimental_useProviders>["providers"][number];

export function PlanModelsSettings() {
  const { providers, status } = experimental_useProviders();
  const { models, setModel } = usePlanModels();
  if (status === "loading" || models === null) return <p style={muted}>Loading…</p>;
  const planProviders = providers.filter((provider) =>
    provider.composerActions.some((action) => action.kind === "plan"),
  );
  if (planProviders.length === 0) {
    return <p style={muted}>No installed agent offers Plan mode.</p>;
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {planProviders.map((provider) => (
        <ProviderPlanModel
          key={provider.id}
          provider={provider}
          value={models[provider.id] ?? null}
          onChange={(selection) => setModel(provider.id, selection)}
        />
      ))}
    </div>
  );
}

function ProviderPlanModel({
  provider,
  value,
  onChange,
}: {
  provider: ProviderInfo;
  value: ModelSelection | null;
  onChange(selection: ModelSelection | null): Promise<void>;
}) {
  const sdk = useSdk();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  // Start from the agent's default model; the picker changes it from there.
  const useDedicated = () =>
    run(async () => {
      const { models } = await sdk.providers.models({ providerId: provider.id });
      const start = models.find((model) => model.isDefault) ?? models[0];
      if (!start) throw new Error(`${provider.displayName} has no models available.`);
      await onChange({ model: start.model, reasoningLevel: start.defaultReasoningEffort });
    });

  const name = `plan-model-${provider.id}`;
  return (
    <fieldset style={{ display: "grid", gap: 8, border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 4 }}>{provider.displayName}</legend>
      <label style={row}>
        <input
          type="radio"
          name={name}
          checked={value === null}
          disabled={busy}
          onChange={() => void run(() => onChange(null))}
        />
        Same as the thread's current model
      </label>
      <label style={row}>
        <input
          type="radio"
          name={name}
          checked={value !== null}
          disabled={busy}
          onChange={() => void useDedicated()}
        />
        A dedicated plan model
      </label>
      {value ? (
        <div style={{ paddingLeft: 24 }}>
          <ProviderModelPicker
            allowProviderChange={false}
            disabled={busy}
            value={{ providerId: provider.id, ...value }}
            onChange={(next) =>
              void run(() =>
                onChange({
                  model: next.model,
                  reasoningLevel: next.reasoningLevel,
                  ...(next.serviceTier ? { serviceTier: next.serviceTier } : {}),
                }),
              )
            }
          />
        </div>
      ) : null}
      {error ? <p role="alert" style={{ ...muted, margin: 0 }}>{error}</p> : null}
    </fieldset>
  );
}

const row = { display: "flex", alignItems: "center", gap: 8 } as const;
const muted = { opacity: 0.7, fontSize: 13 } as const;
