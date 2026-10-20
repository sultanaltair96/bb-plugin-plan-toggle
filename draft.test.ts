import { expect, test } from "vitest";
import type { ComposerDraftSnapshot, ComposerMention } from "@get-bb/plugin-sdk/app";
import { hasPlanCommand, withPlanCommand, withoutPlanCommand } from "./draft";

const command = (name: string, from: number): ComposerMention => ({
  from,
  to: from + name.length + 1,
  label: `/${name}`,
  kind: "command",
  trigger: "/",
  name,
  source: "command",
  origin: "user",
  argumentHint: null,
});
const thread: ComposerMention = {
  from: 0,
  to: 0,
  label: "@thr",
  kind: "thread",
  threadId: "t1",
};
const draft = (text: string, mentions: ComposerMention[] = []): ComposerDraftSnapshot => ({
  text,
  mentions,
  attachments: [],
});

test("adds /plan in front of the draft and shifts other mentions", () => {
  const mention = { ...thread, from: 4, to: 8 };
  const result = withPlanCommand(draft("fix @thr now", [mention]));
  expect(result.text).toBe("/plan fix @thr now");
  expect(result.mentions[0]).toMatchObject({ kind: "command", name: "plan", from: 0, to: 5 });
  expect(result.mentions[1]).toMatchObject({ kind: "thread", from: 10, to: 14 });
  expect(result.text.slice(10, 14)).toBe("@thr");
});

test("adds /plan to an empty draft", () => {
  expect(withPlanCommand(draft(""))).toMatchObject({ text: "/plan " });
});

test("replaces another leading command, like bb's Plan action", () => {
  const result = withPlanCommand(draft("/goal ship it", [command("goal", 0)]));
  expect(result.text).toBe("/plan ship it");
  expect(result.mentions).toHaveLength(1);
  expect(result.mentions[0]).toMatchObject({ name: "plan" });
});

test("removes /plan and shifts other mentions back", () => {
  const added = withPlanCommand(draft("fix @thr now", [{ ...thread, from: 4, to: 8 }]));
  const staged = draft(added.text, [...added.mentions]);
  expect(hasPlanCommand(staged)).toBe(true);
  const removed = withoutPlanCommand(staged);
  expect(removed.text).toBe("fix @thr now");
  expect(removed.mentions).toEqual([{ ...thread, from: 4, to: 8 }]);
});

test("only a leading /plan command counts as staged", () => {
  expect(hasPlanCommand(draft("fix it"))).toBe(false);
  expect(hasPlanCommand(draft("/plan typed as text"))).toBe(false);
  expect(hasPlanCommand(draft("/goal x", [command("goal", 0)]))).toBe(false);
  expect(hasPlanCommand(draft("see /plan", [command("plan", 4)]))).toBe(false);
});
