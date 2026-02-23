import { describe, expect, test } from "vitest";
import { planCreateSchema, saveTrailSchema, calendarCreateSchema } from "../src/server/validators";

describe("zod validators", () => {
  test("saveTrailSchema ok", () => {
    const r = saveTrailSchema.safeParse({ trailId: "abc" });
    expect(r.success).toBe(true);
  });

  test("planCreateSchema rejects bad duration", () => {
    const r = planCreateSchema.safeParse({
      trailId: "t1",
      startAt: new Date().toISOString(),
      durationMin: 1
    });
    expect(r.success).toBe(false);
  });

  test("calendarCreateSchema ok", () => {
    const r = calendarCreateSchema.safeParse({ planId: "p1" });
    expect(r.success).toBe(true);
  });
});
