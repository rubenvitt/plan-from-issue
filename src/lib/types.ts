export interface GitHubIssuePreview {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: string;
  repository: string;
  htmlUrl: string;
}

export interface LocalSettings {
  providerApiKey: string;
  modelId: string;
  baseUrl: string;
  githubToken: string;
}

export const DEFAULT_SETTINGS: LocalSettings = {
  providerApiKey: "",
  modelId: "gpt-5.4",
  baseUrl: "",
  githubToken: "",
};
