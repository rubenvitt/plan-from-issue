import {
  githubIssueRequestSchema,
  parseGitHubIssueUrl,
} from "@/lib/github";
import type { GitHubIssuePreview } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = githubIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Provide either issueUrl or { owner, repo, issueNumber }" },
      { status: 400 }
    );
  }

  let owner: string, repo: string, issueNumber: number;

  if ("issueUrl" in parsed.data) {
    try {
      ({ owner, repo, issueNumber } = parseGitHubIssueUrl(
        parsed.data.issueUrl
      ));
    } catch {
      return Response.json(
        { error: "Could not parse GitHub issue URL" },
        { status: 400 }
      );
    }
  } else {
    ({ owner, repo, issueNumber } = parsed.data);
  }

  const githubToken = req.headers.get("x-github-token");

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.full+json",
    "User-Agent": "plan-from-issue-app",
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  let ghResponse: Response;
  try {
    ghResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      { headers }
    );
  } catch (err) {
    return Response.json(
      { error: `GitHub API request failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 502 }
    );
  }

  if (!ghResponse.ok) {
    const text = await ghResponse.text().catch(() => "");
    return Response.json(
      {
        error: `GitHub API returned ${ghResponse.status}: ${text.slice(0, 200)}`,
      },
      { status: ghResponse.status >= 500 ? 502 : ghResponse.status }
    );
  }

  const data = await ghResponse.json();

  const preview: GitHubIssuePreview = {
    number: data.number,
    title: data.title,
    body: data.body_text || data.body || "",
    labels: (data.labels ?? []).map((l: { name: string } | string) =>
      typeof l === "string" ? l : l.name
    ),
    state: data.state,
    repository: `${owner}/${repo}`,
    htmlUrl: data.html_url,
  };

  return Response.json(preview);
}
