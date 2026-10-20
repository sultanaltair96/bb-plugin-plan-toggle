// Tap Control (press and release on its own; left Ctrl off the Mac by
// default) to toggle Plan mode in the composer you are using. Installed as a
// content script.
import type { PluginContentScriptContext } from "@get-bb/plugin-sdk/app";
import { preferences, requestToggle } from "./bus";
import { matchesToggleKey, resolveToggleKey } from "./keys";

/** A press held longer than this is not a tap. */
export const MAX_TAP_MS = 300;

export const PROMPTBOX = "[data-promptbox]";

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0;
}

/** Prefers the focused composer, then the last one focused, then any visible one. */
function pickPromptbox(lastFocused: Element | null): Element | null {
  const focused = document.activeElement?.closest(PROMPTBOX);
  if (focused) return focused;
  if (lastFocused?.isConnected && isVisible(lastFocused)) return lastFocused;
  return Array.from(document.querySelectorAll(PROMPTBOX)).find(isVisible) ?? null;
}

export function mountKeyboardShortcut({ signal }: PluginContentScriptContext): () => void {
  let pressStartedAt: number | null = null;
  let pressIsClean = false;
  let lastFocusedPromptbox: Element | null = null;

  const interrupt = () => {
    pressIsClean = false;
  };

  const isToggleKey = (event: KeyboardEvent) =>
    matchesToggleKey(event, resolveToggleKey(preferences.toggleKey));

  const onKeyDown = (event: KeyboardEvent) => {
    if (isToggleKey(event)) {
      if (event.repeat) return;
      pressStartedAt = event.timeStamp;
      pressIsClean = true;
      return;
    }
    // Control+A, Control+Tab, plain typing: not a tap.
    interrupt();
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (!isToggleKey(event)) return;
    const isTap =
      pressIsClean &&
      pressStartedAt !== null &&
      event.timeStamp - pressStartedAt <= MAX_TAP_MS;
    pressStartedAt = null;
    pressIsClean = false;
    if (!isTap) return;
    // Leave dialogs (settings, pickers, confirmations) alone.
    if (document.activeElement?.closest('[role="dialog"], [role="alertdialog"]')) return;
    requestToggle(pickPromptbox(lastFocusedPromptbox));
  };

  const onFocusIn = (event: FocusEvent) => {
    const promptbox = (event.target as Element | null)?.closest?.(PROMPTBOX);
    if (promptbox) lastFocusedPromptbox = promptbox;
  };

  const options = { capture: true, signal } as const;
  window.addEventListener("keydown", onKeyDown, options);
  window.addEventListener("keyup", onKeyUp, options);
  // Control+click is a right-click on macOS.
  window.addEventListener("pointerdown", interrupt, options);
  window.addEventListener("blur", interrupt, options);
  document.addEventListener("focusin", onFocusIn, options);

  return () => {
    // The abort signal already removed the listeners.
    lastFocusedPromptbox = null;
  };
}
