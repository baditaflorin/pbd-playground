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
  const commit = embeddedBuildInfo.buildCommit;

  return {
    version: embeddedBuildInfo.version,
    buildCommit: commit,
    buildDate: embeddedBuildInfo.buildDate,
    liveCommit: commit,
    commitUrl: `${repositoryUrl}/commit/${commit}`,
  };
}
