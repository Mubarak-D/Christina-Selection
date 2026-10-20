import { describe, expect, test } from "vitest";
import {
  applyAnswer, flagSinhala, isDraft, mergeFill, revisionChanges, toFill, numbersPreserved, openMust, readBackMessage, recordChange,
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
