// Add or remove bb's `/plan` command pill at the start of a composer draft,
// the same edit the composer's + → Plan action makes.
import type {
  ComposerDraftReplacement,
  ComposerDraftSnapshot,
  ComposerMention,
} from "@get-bb/plugin-sdk/app";

const PLAN_TEXT = "/plan";
/** bb's plan command is `/plan` followed by one space for every provider that offers it. */
const PLAN_PREFIX = `${PLAN_TEXT} `;

const planMention: ComposerMention = {
  from: 0,
  to: PLAN_TEXT.length,
  label: PLAN_TEXT,
  kind: "command",
  trigger: "/",
  name: "plan",
  source: "command",
  origin: "user",
  argumentHint: null,
};

function leadingCommand(draft: ComposerDraftSnapshot): ComposerMention | undefined {
  return draft.mentions.find((mention) => mention.kind === "command" && mention.from === 0);
}

function shift(mention: ComposerMention, by: number): ComposerMention {
  return { ...mention, from: mention.from + by, to: mention.to + by };
}

/** The draft will be sent as a plan request. */
export function hasPlanCommand(draft: ComposerDraftSnapshot): boolean {
  const leading = leadingCommand(draft);
  return leading?.kind === "command" && leading.trigger === "/" && leading.name === "plan";
}

/** Like bb's own Plan action, this replaces any other leading command (such as `/goal`). */
export function withPlanCommand(draft: ComposerDraftSnapshot): ComposerDraftReplacement {
  const leading = leadingCommand(draft);
  const rest = draft.text.slice(leading?.to ?? 0).trimStart();
  const offset = PLAN_PREFIX.length - (draft.text.length - rest.length);
  return {
    text: `${PLAN_PREFIX}${rest}`,
    mentions: [
      planMention,
      ...draft.mentions.filter((mention) => mention !== leading).map((m) => shift(m, offset)),
    ],
  };
}

export function withoutPlanCommand(draft: ComposerDraftSnapshot): ComposerDraftReplacement {
  const leading = leadingCommand(draft);
  if (!leading) return draft;
  const rest = draft.text.slice(leading.to).trimStart();
  const offset = rest.length - draft.text.length;
  return {
    text: rest,
    mentions: draft.mentions.filter((mention) => mention !== leading).map((m) => shift(m, offset)),
  };
}
