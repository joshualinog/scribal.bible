GitHub App setup and usage for content workflows
===============================================

Overview
--------
This document explains how to create a GitHub App, install it on both the private content repo and the public hosting repo, and how to wire the workflows included in `content-repo-template/.github/workflows/`.

High-level flow
---------------
- Private repo: Issues are authored and labeled `isPost`. A workflow generates per-issue JSON files and (optionally) commits them in the private repo. The workflow then obtains an installation token for the public repo and sends a `repository_dispatch` event named `posts-updated`.
- Public repo: A workflow listens for `repository_dispatch` (type `posts-updated`). The workflow uses the GitHub App installation token to checkout the private repo, copy the generated JSON and assets into `src/_data/posts` and `src/assets/posts`, then builds/deploys.

Create the GitHub App
---------------------
1. Go to GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.
2. Fill the form:
   - **GitHub App name**: e.g. `scribal-content-sync`
   - **Homepage URL**: your project URL or repo URL
   - **Webhook URL**: optional (not required for this flow)
   - **Webhook secret**: optional
3. Set permissions (minimum recommended):
   - **Repository permissions**:
     - `Contents` : Read & write (needed to clone and push files)
     - `Issues` : Read-only or Read & write (if you want app to read issue content)
     - `Metadata` : Read-only
   - **Subscribe to events**: leave empty unless you want webhooks
4. Create the App.
5. Generate and download the **Private key** (PEM). Keep it safe.
6. Note the **App ID** (integer) from the App settings.

Install the App on the repos
----------------------------
1. On the App settings page, click **Install App**.
2. Install the app on both the private content repo and the public hosting repo (either for a single repo or for the entire account/org).

What secrets to add to each repo
--------------------------------
In both the private and public repos (or at least the repos running the workflows) add these Actions secrets:

- `GITHUB_APP_ID` : the App ID (integer)
- `GITHUB_APP_PRIVATE_KEY` : the entire PEM private key content (multi-line secret)

Additionally, in the private repo workflow you will set the following as repo secrets (or hard-code values in the workflow inputs):

- `TARGET_PUBLIC_OWNER` : owner of public repo (e.g. `joshualinog`)
- `TARGET_PUBLIC_REPO` : public repo name (e.g. `scribal.bible`)

In the public repo add:

- `PRIVATE_CONTENT_OWNER` : owner of the private content repo
- `PRIVATE_CONTENT_REPO` : private repo name (e.g. `scribal.bible-CONTENT-CREATION`)

How the workflows use the App
----------------------------
1. The workflows create a short-lived JWT signed with the App private key.
2. The workflow uses the JWT to query the installation id for the target repo.
3. The workflow requests an installation access token for that installation id.
4. The installation token is used to call GitHub API endpoints or to clone repositories and perform repo-scoped operations.

Files added in this template
---------------------------
- `.github/workflows/generate-and-dispatch-with-app.yml` — runs in the private content repo to generate JSON and dispatch to public repo using the App.
- `.github/workflows/receive-dispatch-with-app.yml` — runs in the public hosting repo to receive dispatch and fetch JSON from private repo using the App.

Security notes
--------------
- Keep the App private key secret. Store it as an Actions secret named `GITHUB_APP_PRIVATE_KEY`.
- Limit App permissions to the minimum required.
- Consider using per-repo installation or an org installation and controlling access via repo selection.

If you'd like, I can:
- Add these workflows directly into your repos if you clone the private repo into this workspace, or
- Walk you through creating the App step-by-step and verifying the first dispatch/run.
