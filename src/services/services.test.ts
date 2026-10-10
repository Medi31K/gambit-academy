import { describe, expect, it } from "vitest";
import { puzzleService } from "./puzzleService";
import { authService } from "./authService";
import { lessonService } from "./lessonService";
import { progressService } from "./progressService";
describe("Frontend service contracts", () => {
  it("never provides fabricated puzzle positions", async () => {
    // Without a database connection there are no puzzles, never made-up ones.
    expect(await puzzleService.next()).toBeNull();
    expect(await puzzleService.list()).toEqual([]);
  });
  it("offers a guest state without requiring an account", async () => {
    expect(await authService.getUser()).toBeNull();
  });
  it("does not fabricate training history", async () => {
    expect(await progressService.get()).toBeNull();
  });
  it("does not fabricate lesson positions", async () => {
    expect(await lessonService.list()).toEqual([]);
    expect(await lessonService.get("tactics")).toBeNull();
  });
});
