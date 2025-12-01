Content repo template: generate posts and push to hosting repo

Overview
--------
These files are a template intended to be placed in your content repository
(e.g. `joshualinog/scribal.bible-CONTENT-CREATION`). The workflow will:

- Run on `issues` and `issue_comment` events
- Generate JSON files for Eleventy into `src/_data/posts/*.json`
- Download referenced assets into `src/assets/posts/<slug>/`
- Clone the hosting repo (e.g. `joshualinog/scribal.bible`), copy generated files
  into `src/_data/posts/` and `src/assets/posts/`, then commit & push

Files
-----
- `generate-and-push.js`: main script to fetch issues and push to hosting repo
- `.github/workflows/generate-and-push.yml`: workflow to run the script

Setup (required)
----------------
1. Copy the `content-scripts/generate-and-push.js` and `.github/workflows/generate-and-push.yml`
   into your content repo. You can keep them under `content-scripts/` in the content repo.

2. Add a repository secret to the content repo named `HOSTING_PUSH_TOKEN` containing a
   Personal Access Token (PAT) that has permission to push to the hosting repository.

   Recommended minimum scopes:
   - If the hosting repo is private: `repo` (this gives read/write to code; create a machine user if possible)
   - If the hosting repo is public: `public_repo` may be enough for pushing to default branch

   Security notes:
   - Use a dedicated machine user or short-lived token where possible.
   - Store the token only in GitHub Secrets; do not hard-code it.
   - Consider using a GitHub App for a more auditable and fine-grained permission model.

3. Confirm the `HOSTING_REPO` value in the workflow is correct (owner/repo format). By default
   it is set to `joshualinog/scribal.bible` in the template.

How it works
------------
- The workflow runs in the content repo and uses `GITHUB_TOKEN` to read issues.
- The script generates a temporary worktree containing `src/_data/posts/*` and `src/assets/posts/*`.
- The script clones the hosting repo using the `HOSTING_PUSH_TOKEN` and copies the generated files in,
  commits, and pushes to `main`.

Avoiding infinite loops
-----------------------
- The workflow triggers on issue events in the content repo — pushing to the hosting repo will not
  trigger the content repo workflow. On the hosting repo side, if you have workflows that respond to
  pushes and re-run the content generation, ensure they do not push back to the content repo.

Variants
--------
- Instead of cloning and pushing directly, you could have the content repo open a Pull Request
  in the hosting repo (safer workflow for review). The template uses direct push for simplicity.

Questions / next steps
- Want me to:
  - create a PR in the content repo with these files (I need access), or
  - modify the hosting repo workflow to accept pushes from the content repo? 
