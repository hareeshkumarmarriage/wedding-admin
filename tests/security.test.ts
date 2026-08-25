import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl } from "../src/lib/homepageMedia";

describe("security helpers", () => {
  it("accepts only valid YouTube IDs and hosts", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeEmbedUrl("https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ")).toBe("");
  });
});
