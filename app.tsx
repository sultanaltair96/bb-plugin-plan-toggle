// bb-plugin-plan-toggle — tap Control to switch the composer between Build
// and bb's Plan mode, like OpenCode's Plan/Build toggle, optionally with a
// dedicated plan model per agent.
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountKeyboardShortcut } from "./keyboard";
import { PlanToggle } from "./plan-toggle";
import { PlanModelsSettings } from "./settings-section";

export default definePluginApp((app) => {
  app.contentScripts.register({ id: "control-tap", mount: mountKeyboardShortcut });
  app.composer.customize({
    id: "plan-toggle",
    scopes: ["thread", "new-thread"],
    banners: [{ id: "plan-toggle", chrome: "bare", component: PlanToggle }],
  });
  app.slots.settingsSection({
    id: "plan-models",
    title: "Plan model",
    description: "The model each agent uses while in Plan mode. Leaving Plan switches back.",
    component: PlanModelsSettings,
  });
});
