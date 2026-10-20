// bb-plugin-plan-toggle — backend entry. Stores the per-agent plan models
// chosen on the plugin's settings page; everything else is frontend.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { PLAN_MODELS_CHANGED } from "./channels";

const modelSelectionSchema = z.object({
  model: z.string().min(1),
  reasoningLevel: z.string().min(1),
  serviceTier: z.string().min(1).optional(),
});
export type ModelSelection = z.infer<typeof modelSelectionSchema>;

/** Plan model per agent provider id. A missing provider plans with its current model. */
const planModelsSchema = z.record(z.string(), modelSelectionSchema);
export type PlanModels = z.infer<typeof planModelsSchema>;

export const rpcContract = defineRpcContract({
  plan_models_get: {
    input: z.null(),
    output: z.object({ models: planModelsSchema }),
  },
  plan_model_set: {
    input: z.object({
      providerId: z.string().min(1).max(200),
      /** null: plan with the current model. */
      selection: modelSelectionSchema.nullable(),
    }),
    output: z.object({ models: planModelsSchema }),
  },
});

const STORAGE_KEY = "plan-models";

export default async function plugin(bb: BbPluginApi) {
  const read = async (): Promise<PlanModels> => {
    const parsed = planModelsSchema.safeParse(await bb.storage.kv.get(STORAGE_KEY));
    return parsed.success ? parsed.data : {};
  };

  bb.rpc.register(rpcContract, {
    plan_models_get: async () => ({ models: await read() }),
    plan_model_set: async ({ providerId, selection }) => {
      const models = await read();
      if (selection) models[providerId] = selection;
      else delete models[providerId];
      await bb.storage.kv.set(STORAGE_KEY, models);
      bb.realtime.publish(PLAN_MODELS_CHANGED, null);
      return { models };
    },
  });

  bb.log.info("loaded");
}
