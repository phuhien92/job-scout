import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchFindworkJobs } from "@/lib/findwork";

export const employmentTypeSchema = z.enum(["fulltime", "parttime", "contract", "internship"]);

export const searchJobsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("The role or keyword to search for, e.g. 'frontend engineer'."),
  location: z
    .string()
    .optional()
    .describe("A city, a country, or 'remote'. Omit to search anywhere."),
  remote: z
    .boolean()
    .optional()
    .describe("Set true to show only remote jobs. Omit for no remote filter."),
  employmentType: employmentTypeSchema
    .optional()
    .describe("Optional employment type filter: fulltime, parttime, contract, or internship."),
});

export const searchJobsOutputSchema = z.object({
  jobs: z
    .array(
      z.object({
        title: z.string().describe("The job title exactly as Findwork lists it."),
        company: z.string().describe("The hiring company name exactly as Findwork lists it."),
        location: z.string().describe("The job location exactly as Findwork lists it."),
        remote: z.boolean().describe("Whether the listing is remote."),
        salary: z
          .string()
          .nullable()
          .describe("Formatted salary range when Findwork provides one, otherwise null."),
        summary: z
          .string()
          .describe("A short plain-text summary of the description, stripped of HTML."),
        url: z
          .string()
          .url()
          .describe("The original listing URL returned by Findwork. Never alter this URL."),
      }),
    )
    .describe("Live listings returned by Findwork for this search. Empty when nothing matches."),
});

export const searchJobs = createTool({
  id: "search-jobs",
  description:
    "Search live job listings on Findwork by role, location, and remote preference. Returns real, schema-validated listings or an error; never invents results.",
  inputSchema: searchJobsInputSchema,
  outputSchema: searchJobsOutputSchema,
  execute: async ({ query, location, remote, employmentType }) => {
    const jobs = await searchFindworkJobs({ query, location, remote, employmentType });
    return { jobs };
  },
});