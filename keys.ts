// Which Control key toggles Plan mode. Shared by the server (setting
// descriptor) and the app (key matching); touches the DOM only when called.

export const TOGGLE_KEY_SETTING_LABELS = {
  auto: "Automatic: either Control on Mac, left Ctrl on Windows and Linux",
  Control: "Either Control key",
  ControlLeft: "Left Control",
  ControlRight: "Right Control",
} as const;

export type ToggleKeySetting = keyof typeof TOGGLE_KEY_SETTING_LABELS;
export type ToggleKey = Exclude<ToggleKeySetting, "auto">;

export function parseToggleKeySetting(value: unknown): ToggleKeySetting {
  return typeof value === "string" && value in TOGGLE_KEY_SETTING_LABELS
    ? (value as ToggleKeySetting)
    : "auto";
}

export function isApplePlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent);
}

/**
 * Off the Mac, right Ctrl is the Voice Shortcut plugin's default key, so the
 * default here is the left one.
 */
export function resolveToggleKey(setting: ToggleKeySetting): ToggleKey {
  if (setting !== "auto") return setting;
  return isApplePlatform() ? "Control" : "ControlLeft";
}

export function matchesToggleKey(event: KeyboardEvent, key: ToggleKey): boolean {
  if (event.key !== "Control") return false;
  if (key === "Control") return true;
  if (event.code) return event.code === key;
  // Some keyboards and remote sessions report no `code`; use the key's side.
  return (
    event.location ===
    (key === "ControlLeft" ? KeyboardEvent.DOM_KEY_LOCATION_LEFT : KeyboardEvent.DOM_KEY_LOCATION_RIGHT)
  );
}
