import { Stats } from 'fs';
import { sep, dirname, join, resolve } from 'path';
import { lstat, readlink, readFile, realpath } from 'fs-extra';
import { getPkgName } from './pkg-name';

async function isYarn(): Promise<boolean> {
  let s: Stats;
  let binPath = process.argv[1];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    s = await lstat(binPath);
    if (s.isSymbolicLink()) {
      binPath = resolve(dirname(binPath), await readlink(binPath));
    } else {
      break;
    }
  }
  const pkgPath = join(dirname(binPath), '..', 'package.json');
  /*
   * Generally, pkgPath looks like:
   * "/Users/username/.config/yarn/global/node_modules/vercel/package.json"
   * "/usr/local/share/.config/yarn/global/node_modules/vercel/package.json"
   */
  return pkgPath.includes(join('yarn', 'global'));
}

async function getConfigPrefix() {
  const paths = [
    process.env.npm_config_userconfig || process.env.NPM_CONFIG_USERCONFIG,
    join(process.env.HOME || '/', '.npmrc'),
    process.env.npm_config_globalconfig || process.env.NPM_CONFIG_GLOBALCONFIG,
  ].filter(Boolean);

  for (const configPath of paths) {
    if (!configPath) {
      continue;
    }

    const content = await readFile(configPath)
      .then((buffer: Buffer) => buffer.toString())
      .catch(() => null);

    if (content) {
      const [prefix] = content
        .split('\n')
        .map((line: string) => line && line.trim())
        .filter((line: string) => line && line.startsWith('prefix'))
        .map((line: string) => line.slice(line.indexOf('=') + 1).trim());

      if (prefix) {
        return prefix;
      }
    }
  }

  return null;
}

async function isGlobal() {
  try {
    // This is true for e.g. nvm, node path will be equal to now path
    if (dirname(process.argv[0]) === dirname(process.argv[1])) {
      return true;
    }

    const isWindows = process.platform === 'win32';
    const defaultPath = isWindows ? process.env.APPDATA : '/usr/local/lib';

    const installPath = await realpath(resolve(__dirname));

    if (
      installPath.includes(['', 'yarn', 'global', 'node_modules', ''].join(sep))
    ) {
      return true;
    }

    if (installPath.includes(['', 'fnm', 'node-versions', ''].join(sep))) {
      return true;
    }

    const prefixPath =
      process.env.PREFIX ||
      process.env.npm_config_prefix ||
      process.env.NPM_CONFIG_PREFIX ||
      (await getConfigPrefix()) ||
      defaultPath;

    if (!prefixPath) {
      return true;
    }

    return installPath.startsWith(await realpath(prefixPath));
  } catch (_) {
    // Default to global
    return true;
  }
}

export default async function getUpdateCommand(): Promise<string> {
  const pkgAndVersion = `${getPkgName()}@latest`;

  if (await isGlobal()) {
    return (await isYarn())
      ? `yarn global add ${pkgAndVersion}`
      : `npm i -g ${pkgAndVersion}`;
  }

  return (await isYarn())
    ? `yarn add ${pkgAndVersion}`
    : `npm i ${pkgAndVersion}`;
}
