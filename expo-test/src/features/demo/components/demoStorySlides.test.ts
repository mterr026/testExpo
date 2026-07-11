import { describe, expect, it } from "vitest";

import { demoStorySlides } from "./demoStorySlides";

describe("demoStorySlides", () => {
  it("keeps_the_story_short", () => {
    expect(demoStorySlides.length).toBe(3);
  });

  it("covers_the_core_ideas", () => {
    const titles = demoStorySlides.map((slide) => slide.title.toLowerCase());

    expect(titles.some((title) => title.includes("paycheck"))).toBe(true);
    expect(titles.some((title) => title.includes("cycle") || title.includes("bills"))).toBe(true);
    expect(titles.some((title) => title.includes("spending") || title.includes("log"))).toBe(true);
  });

  it("has_non_empty_copy", () => {
    for (const slide of demoStorySlides) {
      expect(slide.eyebrow.length).toBeGreaterThan(0);
      expect(slide.title.length).toBeGreaterThan(0);
      expect(slide.body.length).toBeGreaterThan(0);
    }
  });
});
