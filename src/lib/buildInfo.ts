export const repositoryUrl = "https://github.com/baditaflorin/pbd-playground";
export const paypalUrl = "https://www.paypal.com/paypalme/florinbadita";
export const pagesUrl = "https://baditaflorin.github.io/pbd-playground/";

export interface BuildInfo {
  version: string;
  buildCommit: string;
  buildDate: string;
  liveCommit: string;
  commitUrl: string;
}

export const embeddedBuildInfo = {
  version: __APP_VERSION__,
  buildCommit: __GIT_COMMIT__,
  buildDate: __BUILD_DATE__,
};

export async function resolveBuildInfo(): Promise<BuildInfo> {
  const fallbackCommit = embeddedBuildInfo.buildCommit;

  try {
    const response = await fetch(
      "https://api.github.com/repos/baditaflorin/pbd-playground/commits/main",
      {
        headers: {
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub commit lookup failed: ${response.status}`);
    }

    const data = (await response.json()) as { sha?: string; html_url?: string };
    const sha = data.sha?.slice(0, 7) ?? fallbackCommit;

    return {
      version: embeddedBuildInfo.version,
      buildCommit: embeddedBuildInfo.buildCommit,
      buildDate: embeddedBuildInfo.buildDate,
      liveCommit: sha,
      commitUrl: data.html_url ?? `${repositoryUrl}/commit/${sha}`,
    };
  } catch {
    return {
      version: embeddedBuildInfo.version,
      buildCommit: embeddedBuildInfo.buildCommit,
      buildDate: embeddedBuildInfo.buildDate,
      liveCommit: fallbackCommit,
      commitUrl: `${repositoryUrl}/commit/${fallbackCommit}`,
    };
  }
}
