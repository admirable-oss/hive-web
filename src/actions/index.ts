import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { getRoadmapData } from "@/lib/roadmap/server";

export const server = {
  /** Everything /roadmap shows, read server-side (token stays here) and cached per resource. */
  roadmap: defineAction({
    input: z.object({ force: z.boolean().optional() }).optional(),
    handler: (input) => getRoadmapData({ force: input?.force }),
  }),
};
