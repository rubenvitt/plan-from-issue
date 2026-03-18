import { z } from "zod";

const issueUrlSchema = z
  .string()
  .url()
  .regex(/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+/);

export function parseGitHubIssueUrl(url: string): {
  owner: string;
  repo: string;
  issueNumber: number;
} {
  issueUrlSchema.parse(url);
  const match = url.match(
    /github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/
  );
  if (!match) throw new Error("Invalid GitHub issue URL");
  return { owner: match[1], repo: match[2], issueNumber: Number(match[3]) };
}

export const githubIssueRequestSchema = z.union([
  z.object({ issueUrl: z.string().url() }),
  z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    issueNumber: z.number().int().positive(),
  }),
]);

export type GitHubIssueRequest = z.infer<typeof githubIssueRequestSchema>;
