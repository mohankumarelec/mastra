# Publishing to a community scope

This package lives in a fork of the Mastra monorepo and is published to npm as
`@mastra-community/auth-oidc` by `.github/workflows/publish-auth-oidc.yml`,
using npm Trusted Publishing (OIDC). No `NPM_TOKEN` secret is stored anywhere.

The upstream source keeps the name `@mastra/auth-oidc`; the scope is rewritten
at publish time by `scripts/prepare-community-publish.mjs`, which also drops
pnpm `workspace:*` devDependencies and lifecycle scripts from the published
manifest.

## One-time setup

npm cannot create a package through OIDC, so the first version has to be
published with a normal login. Everything after that is tokenless.

### 1. Enable account-level 2FA

Required by `npm trust`. npmjs.com → avatar → **Account** → **Two-Factor
Authentication**.

### 2. Publish the first version manually

From a clean checkout of this branch:

```bash
npm login
pnpm install --frozen-lockfile --filter "@mastra/auth-oidc..."
pnpm turbo build --filter @mastra/auth-oidc
PUBLISH_VERSION=0.1.0 PUBLISH_REPO=<owner>/mastra \
  node auth/oidc/scripts/prepare-community-publish.mjs
cd auth/oidc && npm publish
```

Then **discard the working tree changes** — the rewritten `package.json`,
`README.md` and copied `LICENSE.md` must never be committed:

```bash
git checkout -- auth/oidc && git clean -f auth/oidc/LICENSE.md
```

### 3. Register the trusted publisher

Now that the package exists, either run:

```bash
npm trust github @mastra-community/auth-oidc \
  --file publish-auth-oidc.yml \
  --repo <owner>/mastra \
  --allow-publish --yes
```

(`npm` 11.15.0+, prompts for a 2FA code), or do it in the web UI:

npmjs.com → **Packages** → `@mastra-community/auth-oidc` → **Settings** →
**Trusted Publisher** → **GitHub Actions**, then fill in:

| Field                | Value                   |
| -------------------- | ----------------------- |
| Organization or user | `<owner>`               |
| Repository           | `mastra`                |
| Workflow filename    | `publish-auth-oidc.yml` |
| Environment name     | _leave empty_           |

Every field is case-sensitive, and the workflow filename is the bare filename,
not a path. npm does not validate the configuration when you save it, so a typo
only shows up as an authentication failure at publish time.

### 4. Lock out tokens (optional, recommended)

Package → **Settings** → **Publishing access** → **Require two-factor
authentication and disallow tokens**. Trusted publishing keeps working, because
OIDC is not a token.

## Releasing

Either push a tag:

```bash
git tag auth-oidc-v0.2.0 && git push fork auth-oidc-v0.2.0
```

or run the workflow manually from the Actions tab with a `version` input. Tick
`dry_run` to build and pack without publishing.

The workflow prints the publisher recorded by the registry at the end. It should
read `GitHub Actions`; anything else means npm fell back to token auth.

## Notes

- Provenance is attached automatically for public repositories. Do not pass
  `--provenance`.
- The runner must be GitHub-hosted. Trusted Publishing rejects self-hosted
  runners.
- Keep the version ahead of whatever was used for the bootstrap publish.
