# Plan Toggle for bb

Switch between **Build** and **Plan** with one key, like OpenCode's
Plan/Build toggle, using [bb](https://getbb.app)'s built-in Plan mode.
Optionally, plan with a different model than the one you build with.

Tap **Control**, pressed and released on its own:

| You're in… | Tap Control → |
| --- | --- |
| Build | bb's `/plan` command is added to the start of your draft ("Plan Mode" label). Your next message asks the agent for a plan to approve. |
| Plan, not yet sent | `/plan` is removed: back to Build. |
| Plan, already active | The thread exits Plan mode, like clicking "Exit plan mode". |

Control combined with another key, a long press, Control-click (right-click on
macOS), and taps while a dialog has focus do nothing. Only agents that offer
Plan mode in bb (Claude Code and Codex) respond.

## Plan model

On the plugin's settings page (Settings → Plugins → Plan Toggle), each agent
with Plan mode has a **Plan model** choice:

- **Same as the thread's current model** (default).
- **A dedicated plan model**: any model and reasoning level of that agent,
  picked with bb's model picker.

With a dedicated plan model, tapping into Plan switches the composer's model
picker to it. Leaving Plan by a tap, approving the plan, or "Exit plan mode"
switches back to the model you had, unless you picked a different one by hand
in the meantime.

Limits: plan models are per agent, since switching agents would start a new bb
thread. After you approve a plan, the agent starts building in the same turn,
still on the plan model; your build model applies from the next message.

## Install

Requires bb 0.46 or later.

```sh
bb plugin install git:https://github.com/sultanaltair96/bb-plugin-plan-toggle
```

Then reload the bb window (⌘R).

## How it works

Everything goes through bb's plugin SDK: the composer API adds or removes the
`/plan` command pill and switches the model (`setSelection`),
`threads.cancelPlan` exits Plan mode, and the sidebar thread view reports
whether a thread is in Plan mode. Plan models are stored in the plugin's own
storage.

## Develop

```sh
npm install
npm test
bb plugin install .   # path install for local development
```

## License

MIT
