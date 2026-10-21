import { describe, expect, test } from "vitest";
import {
  applyAnswer, flagSinhala, flagStale, isDraft, mergeFill, revisionChanges, toFill, numbersPreserved, openMust, readBackMessage, recordChange,
  type JobCard,
} from "@/lib/jobcard";

const AT = "2026-10-19T10:00:00.000Z";
const LATER = "2026-10-20T10:00:00.000Z";

const card = (over: Partial<JobCard> = {}): JobCard => ({
  fields: { item: "Ring", metal: "Gold", purity: "22K", size: "14" },
  edited: [], questions: [], revision: 1, printed_at: null, changes: [], ...over,
});

describe("draft flag", () => {
  test("complete card with no open must is clean", () => expect(isDraft(card())).toBe(false));

  test("missing required field is an open must", () => {
    const c = card({ fields: { item: "Ring", metal: "Gold", purity: "22K" } });
    expect(openMust(c).map((q) => q.field)).toEqual(["size"]);
    expect(isDraft(c)).toBe(true);
  });

  test("open check question does not make a draft", () => {
    expect(isDraft(card({ questions: [{ id: "a", field: "metal", text: "Plated or solid?", level: "check" }] }))).toBe(false);
  });
});

describe("applyAnswer", () => {
  const q = { id: "a", field: "size", text: "Size 14 or 16?", level: "must" as const };

  test("answer fills the field and clears the flag", () => {
    const c = applyAnswer(card({ questions: [q] }), "a", " 16 ", AT);
    expect(c.fields.size).toBe("16");
    expect(c.edited).toContain("size");
    expect(isDraft(c)).toBe(false);
  });

  test("answering a missing-field question sets the field", () => {
    const c = applyAnswer(card({ fields: { item: "Ring", metal: "Gold", purity: "22K" } }), "missing:size", "12", AT);
    expect([c.fields.size, isDraft(c)]).toEqual(["12", false]);
  });

  test("clearing the answer restores the old value and brings the flag back", () => {
    const c = applyAnswer(applyAnswer(card({ questions: [q] }), "a", "16", AT), "a", "", AT);
    expect(c.fields.size).toBe("14");
    expect(isDraft(c)).toBe(true);
  });
});

describe("mergeFill", () => {
  test("never overwrites a field a person edited", () => {
    const c = mergeFill(card({ edited: ["size"] }), {
      fields: { size: "18", stones: "Ruby" }, questions: [], instructions_en: [], instructions_si: [],
    }, AT);
    expect(c.fields.size).toBe("14");
    expect(c.fields.stones).toBe("Ruby");
  });

  test("keeps answered questions, replaces open ones, drops questions on edited fields", () => {
    const c = mergeFill(card({
      edited: ["size"],
      questions: [
        { id: "a", field: "size", text: "Size?", level: "must", answer: "14" },
        { id: "b", text: "Old open question", level: "check" },
      ],
    }), {
      fields: {},
      questions: [{ field: "size", text: "Size again?", level: "must" }, { field: "metal", text: "Plated?", level: "check" }],
      instructions_en: ["Make a 22K ring"], instructions_si: ["22K මුද්දක් හදන්න"],
    }, AT);
    expect(c.questions.map((q) => q.text)).toEqual(["Size?", "Plated?"]);
    expect(new Set(c.questions.map((q) => q.id)).size).toBe(2);
    expect(c.instructions_si).toEqual(["22K මුද්දක් හදන්න"]);
  });
});

describe("recordChange", () => {
  test("before first print: no revision, no history", () => {
    const c = recordChange(card(), "size", "16", AT);
    expect([c.revision, c.changes.length, c.fields.size]).toEqual([1, 0, "16"]);
  });

  test("after print: one revision bump per print, history kept", () => {
    let c = recordChange(card({ printed_at: AT }), "size", "16", LATER);
    c = recordChange(c, "metal", "White gold", LATER);
    expect(c.revision).toBe(2);
    expect(c.changes).toEqual([
      { field: "size", old: "14", new: "16", at: LATER, rev: 2 },
      { field: "metal", old: "Gold", new: "White gold", at: LATER, rev: 2 },
    ]);
  });

  test("an unchanged value records nothing", () => {
    const c = recordChange(card({ printed_at: AT }), "size", "14", LATER);
    expect([c.revision, c.changes.length]).toEqual([1, 0]);
  });
});

test("readBackMessage lists confirmed details and open questions", () => {
  const msg = readBackMessage(card({ questions: [{ id: "a", text: "Plated or solid?", level: "check" }] }), "Nimal");
  expect(msg).toContain("Hi Nimal");
  expect(msg).toContain("Purity: 22K");
  expect(msg).toContain("1. Plated or solid?");
});

describe("numbersPreserved", () => {
  test("same numbers and engraving: ok", () =>
    expect(numbersPreserved(["22K ring, size 14, engrave 'N & R'"], ["22K මුද්ද, size 14, 'N & R'"], "N & R")).toBe(true));
  test("a changed number fails", () => expect(numbersPreserved(["size 14.5"], ["size 15"])).toBe(false));
  test("missing engraving fails", () => expect(numbersPreserved(["engrave Amma"], ["කොටන්න"], "Amma")).toBe(false));
});

describe("toFill", () => {
  test("trims, drops blank questions and maps an empty field link to none", () => {
    const fill = toFill({
      fields: { item: " Ring ", size: "" },
      questions: [{ field: "", text: "Gift wrap?", level: "check" }, { field: "size", text: "  ", level: "must" }],
      instructions_en: [" Make ring ", ""], instructions_si: ["මුද්ද හදන්න"],
    });
    expect(fill.fields).toEqual({ item: "Ring", size: "" });
    expect(fill.questions).toEqual([{ text: "Gift wrap?", level: "check" }]);
    expect(fill.instructions_en).toEqual(["Make ring"]);
  });
});

test("toFill tolerates a loose reply: unknown fields, 'none' links, odd levels, missing lists", () => {
  const fill = toFill({
    fields: { item: "Ring", colour: "red", size: 14 },
    questions: [{ field: "none", text: "Gift box?", level: "urgent" }, { field: "bogus", text: "Size?", level: "must" }],
  } as never);
  expect(fill.fields).toEqual({ item: "Ring" });
  expect(fill.questions).toEqual([{ text: "Gift box?", level: "check" }, { text: "Size?", level: "must" }]);
  expect([fill.instructions_en, fill.instructions_si]).toEqual([[], []]);
});

test("toFill makes any question about a required field blocking, whatever level the AI chose", () => {
  const fill = toFill({ fields: {}, questions: [
    { field: "size", text: "Size 14 or 16?", level: "check" },
    { field: "engraving", text: "Spelling OK?", level: "check" },
  ] });
  expect(fill.questions.map((q) => q.level)).toEqual(["must", "check"]);
});

describe("flagSinhala", () => {
  test("adds one must question when a number differs, and removes it once fixed", () => {
    const bad = flagSinhala(flagSinhala(card({ instructions_en: ["size 14"], instructions_si: ["size 16"] })));
    expect(bad.questions.filter((q) => q.id === "sinhala-check")).toHaveLength(1);
    expect(isDraft(bad)).toBe(true);
    expect(flagSinhala({ ...bad, instructions_si: ["size 14"] }).questions).toHaveLength(0);
  });
});

describe("revisionChanges", () => {
  test("one line per field in the current revision: first old value, latest new; reverted fields drop out", () => {
    let c = card({ printed_at: AT });
    c = recordChange(c, "size", "16", LATER);
    c = recordChange(c, "size", "18", LATER);
    c = recordChange(c, "metal", "Silver", LATER);
    c = recordChange(c, "metal", "Gold", LATER);
    expect(revisionChanges(c)).toEqual({ size: "14" });
  });
});

describe("audit fixes", () => {
  test("a hand-filled card with an engraving and no instructions is not blocked by the Sinhala check", () => {
    const c = flagSinhala(card({ fields: { item: "Ring", metal: "Gold", purity: "22K", size: "14", engraving: "Amma" } }));
    expect(isDraft(c)).toBe(false);
  });

  test("the Sinhala check still blocks when the English has the engraving and the Sinhala doesn't", () => {
    const c = flagSinhala(card({ fields: { ...card().fields, engraving: "Amma" },
      instructions_en: ['Engrave "Amma"'], instructions_si: ["කොටන්න"] }));
    expect(isDraft(c)).toBe(true);
  });

  test("a refill keeps instructions a person wrote", () => {
    const c = mergeFill(card({ edited: ["instructions"], instructions_en: ["Mine"], instructions_si: ["මගේ"] }),
      { fields: {}, questions: [], instructions_en: ["AI"], instructions_si: ["AI si"] }, AT);
    expect([c.instructions_en, c.instructions_si]).toEqual([["Mine"], ["මගේ"]]);
  });

  test("changing a field the instructions mention blocks the card until the instructions are updated", () => {
    const before = card({ instructions_en: ["Make the ring size 14."], instructions_si: ["size 14 මුද්ද"] });
    const after = recordChange(before, "size", "16", AT);
    const flagged = flagStale(before, after);
    expect(isDraft(flagged)).toBe(true);
    expect(flagged.questions.find((q) => q.id === "instructions-stale")?.text).toContain("14");
    // Rewriting the instructions clears it.
    const fixed = flagStale(flagged, { ...flagged, instructions_en: ["Make the ring size 16."], instructions_si: ["size 16 මුද්ද"] });
    expect(isDraft(fixed)).toBe(false);
  });

  test("a value that only appears inside another number doesn't count as mentioned", () => {
    const before = card({ fields: { ...card().fields, size: "1" }, instructions_en: ["Size 14."], instructions_si: ["14"] });
    expect(isDraft(flagStale(before, recordChange(before, "size", "2", AT)))).toBe(false);
  });

  test("the customer's read-back never includes the app's own checks", () => {
    const c = flagSinhala(card({ instructions_en: ["size 14"], instructions_si: ["size 16"],
      questions: [{ id: "q", text: "Plated or solid?", level: "check" }] }));
    const msg = readBackMessage(c, "Nimal");
    expect(msg).toContain("Plated or solid?");
    expect(msg).not.toContain("Sinhala");
  });
});
