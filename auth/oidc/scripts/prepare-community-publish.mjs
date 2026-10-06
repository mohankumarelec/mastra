/**
 * Rewrites auth/oidc/package.json in place so the built package can be
 * published to a community scope instead of the upstream `@mastra` scope.
 *
 * Only ever run this in CI, after the build and immediately before `npm
 * publish`. It mutates the working tree and the result must not be committed.
 *
 * Env:
 *   PUBLISH_NAME     target package name   (default @mastra-community/auth-oidc)
 *   PUBLISH_VERSION  semver to publish     (required)
 *   PUBLISH_REPO     owner/repo on GitHub  (default from GITHUB_REPOSITORY)
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '..', '..');

const name = process.env.PUBLISH_NAME || '@mastra-community/auth-oidc';
const version = process.env.PUBLISH_VERSION;
const repo = process.env.PUBLISH_REPO || process.env.GITHUB_REPOSITORY;

if (!version) throw new Error('PUBLISH_VERSION is required');
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`PUBLISH_VERSION is not semver: ${version}`);
if (!repo) throw new Error('PUBLISH_REPO (or GITHUB_REPOSITORY) is required');

const manifestPath = join(packageDir, 'package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const upstreamName = manifest.name;

if (!existsSync(join(packageDir, 'dist', 'index.js'))) {
  throw new Error('dist/ is missing — build the package before preparing it for publish');
}

manifest.name = name;
manifest.version = version;
manifest.repository = { type: 'git', url: `git+https://github.com/${repo}.git`, directory: 'auth/oidc' };
manifest.homepage = `https://github.com/${repo}/tree/main/auth/oidc`;
manifest.bugs = { url: `https://github.com/${repo}/issues` };
manifest.publishConfig = { access: 'public' };

// devDependencies carry pnpm `workspace:*` ranges that mean nothing outside
// this monorepo, and no lifecycle script should run on a consumer's install.
delete manifest.devDependencies;
delete manifest.scripts;

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

// npm always ships README and LICENSE, so point them at this build rather than
// leaving upstream's package name in the published readme.
const readmePath = join(packageDir, 'README.md');
const readme = readFileSync(readmePath, 'utf8').replaceAll(upstreamName, name);
writeFileSync(
  readmePath,
  `> **Unofficial community build.** This is \`${upstreamName}\` from the\n` +
    `> [Mastra](https://github.com/mastra-ai/mastra) monorepo, republished under the\n` +
    `> \`${name.split('/')[0]}\` scope. It is not published or endorsed by the Mastra team.\n\n` +
    readme,
);

copyFileSync(join(repoRoot, 'LICENSE.md'), join(packageDir, 'LICENSE.md'));

console.log(`prepared ${upstreamName} -> ${name}@${version} (${repo})`);
