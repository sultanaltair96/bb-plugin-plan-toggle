---
name: plan-toggle
description: Explain or troubleshoot the Plan Toggle plugin, which switches a bb composer between Build and Plan mode when the user taps the Control key.
---

# Plan Toggle

Tap **Control** (press and release it on its own) to switch the composer you
are using between Build and bb's built-in Plan mode.

| Current state | Tap Control |
| --- | --- |
| Build | Adds bb's `/plan` command to the start of the draft ("Plan Mode" label appears). The next message asks the agent for a plan to approve. |
| `/plan` waiting in the draft | Removes it: back to Build. |
| Thread already in Plan mode | Exits Plan mode, like the card's "Exit plan mode" button. |

- Control combined with any other key, a long press (over 300 ms),
  Control+click, and taps while a dialog has focus do nothing.
- Only agents that offer Plan mode (Claude Code and Codex) respond.
- Target composer: the focused one, else the last one focused, else the first
  visible one. Works in thread and new-thread composers.
- Key events do not reach the bb window while a terminal or Browser tab has
  focus.
- No CLI commands. Source: https://github.com/sultanaltair96/bb-plugin-plan-toggle
  (`keyboard.ts`, `plan-toggle.tsx`, `draft.ts`, `plan-models.ts`,
  `settings-section.tsx`).

## Plan model

The plugin's settings page (Settings → Plugins → Plan Toggle) has a **Plan
model** section with one choice per agent that offers Plan mode:

- **Same as the thread's current model** (default): Plan never changes the model.
- **A dedicated plan model**: pick any model and reasoning level of that agent
  in bb's model picker.

With a dedicated plan model, a Control tap into Plan switches the composer's
model picker to it and remembers the model you were on. Leaving Plan by a
Control tap, approving the plan, or "Exit plan mode" switches back to that
model, unless you picked a different model by hand during Plan.

Limits:
- Plan models are per agent: a Claude Code thread plans with a Claude model,
  a Codex thread with a Codex model. Switching agents would start a new thread.
- Approving a plan lets the agent start building in the same turn, which
  still runs on the plan model. The build model applies from the next message.
- The remembered build model is kept in this window's local storage.
