import { Mastra } from "@mastra/core";
import { jobScoutAgent } from "./agents/job-scout";

export const mastra = new Mastra({
  agents: {
    jobScout: jobScoutAgent,
  },
});