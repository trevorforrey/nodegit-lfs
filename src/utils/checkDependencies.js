import R from 'ramda';
import LFSVersion from '../commands/version';
import generateResponse from './generateResponse';
import { core } from '../commands/lfsCommands';

import {
  regex as versionRegexes,
  minimumVersions,
  BAD_VERSION
} from '../constants';

/**
 * @function normalizeVersion
 * @param  Array<string> versionArray array of version number eg: ['1', '8', '3'] => 1.8.3
 * @return Number normalized version number
 */
const normalizeVersion = (versionArray) => {
  if (!versionArray || versionArray.length === 0) {
    return BAD_VERSION;
  }
  return R.join('.', versionArray);
};

export const parseVersion = (input, regex) => {
  if (!input) {
    return BAD_VERSION;
  }

  const matches = input.match(regex);
  if (!matches || R.isEmpty(matches)) {
    return BAD_VERSION;
  }

  const numericVersionNumbers = R.filter(match => !isNaN(match), matches);
  if (numericVersionNumbers.length > 0) {
    return normalizeVersion(numericVersionNumbers);
  }
  return matches[1];
};

export const isAtleastGitVersion = gitInput =>
  parseVersion(gitInput, versionRegexes.GIT) >= minimumVersions.GIT;

export const isAtleastLfsVersion = lfsInput =>
  parseVersion(lfsInput, versionRegexes.LFS) >= minimumVersions.LFS;

export const dependencyCheck = () => {
  const response = generateResponse();
  return LFSVersion().then((responseObject) => {
    if (!responseObject.success) {
      throw new Error(responseObject.stderr);
    }

    response.lfs_meets_version = isAtleastLfsVersion(responseObject.version);
    response.lfs_exists = parseVersion(
      responseObject.version,
      versionRegexes.VERSION,
    ) !== BAD_VERSION;
    response.lfs_raw = responseObject.raw;

    return core.git('--version');
  })
  .then(({ stdout }) => {
    response.git_meets_version = isAtleastGitVersion(stdout);
    response.git_exists = parseVersion(
      stdout,
      versionRegexes.VERSION,
    ) !== BAD_VERSION;
    response.git_raw = stdout;
    return response;
  })
  .catch((err) => {
    response.success = false;
    response.errno = BAD_VERSION;
    response.stderr = 'Git LFS does not exist';
    response.raw = err.message;
    return response;
  });
};
