// Connects the keyboard content script to the composer that should toggle.
// Both live in this plugin's single frontend bundle, so module state is
// shared within one bb window.

export interface ToggleTarget {
  /** True when `promptbox` is this composer's `[data-promptbox]` element. */
  owns(promptbox: Element): boolean;
  toggle(): void;
}

const targets = new Set<ToggleTarget>();

export function registerToggleTarget(target: ToggleTarget): () => void {
  targets.add(target);
  return () => {
    targets.delete(target);
  };
}

/** Toggles the composer that owns `promptbox`, or the only one on screen. */
export function requestToggle(promptbox: Element | null): boolean {
  const all = [...targets];
  const target =
    (promptbox ? all.find((candidate) => candidate.owns(promptbox)) : undefined) ??
    (all.length === 1 ? all[0] : undefined);
  target?.toggle();
  return target !== undefined;
}
