#!/usr/bin/env node
/*
  generate-and-push.js

  Intended to run inside the CONTENT repo (e.g. joshualinog/scribal.bible-CONTENT-CREATION).
  - Reads issues labeled as posts
  - Emits JSON files for Eleventy (src/_data/posts/<slug>-<id>.json)
  - Downloads referenced image assets into a local folder
  - Clones the hosting repo and copies generated JSON/assets into it, then commits & pushes

  Required environment variables (set in the workflow as secrets):
  - HOSTING_REPO: owner/repo for the hosting site (e.g. joshualinog/scribal.bible)
  - HOSTING_PUSH_TOKEN: PAT with permission to push to HOSTING_REPO (store as secret)

  Optional environment variables:
  - POST_LABELS: comma-separated labels to treat as posts (default: POST,isPost)
  - GITHUB_TOKEN: automatically provided by Actions for reading the content repo
*/

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const GITHUB_API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN || '';
const HOSTING_REPO = process.env.HOSTING_REPO;
const HOSTING_PUSH_TOKEN = process.env.HOSTING_PUSH_TOKEN;
const LABELS = (process.env.POST_LABELS || 'POST,isPost').split(',').map(s => s.trim()).filter(Boolean);

if (!HOSTING_REPO) {
  console.error('HOSTING_REPO is required (owner/repo)');
  process.exit(2);
}
if (!HOSTING_PUSH_TOKEN) {
  console.error('HOSTING_PUSH_TOKEN is required (set as secret in content repo)');
  process.exit(2);
}

function slugify(s) {
  return s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'post';
}

async function api(pathname) {
  const url = `${GITHUB_API}${pathname}`;
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'content-generate-script' };
  if (TOKEN) headers['Authorization'] = `token ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub API error ${res.status} ${res.statusText}: ${txt}`);
  }
  return res.json();
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buf);
}

async function fetchComments(repo, issueNumber) {
  const data = await api(`/repos/${repo}/issues/${issueNumber}/comments`);
  return data.map(c => ({ author: c.user?.login || null, body: c.body || '', created_at: c.created_at }));
}

async function processIssue(repo, issue, outDir, assetsRoot) {
  const id = issue.number;
  const title = issue.title || `Post ${id}`;
  const slug = slugify(issue.title || `post-${id}`) + `-${id}`;
  const labels = (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name)).filter(Boolean);
  const tags = labels.filter(l => !LABELS.includes(l));

  let body = issue.body || '';

  // download images referenced as markdown ![alt](url)
  const imgRegex = /!\[[^\]]*\]\((https?:[^)"']+)\)/g;
  const assetFiles = [];
  let m;
  while ((m = imgRegex.exec(body)) !== null) {
    try {
      const url = m[1];
      const filename = path.basename(new URL(url).pathname) || `image-${Date.now()}.png`;
      const assetDir = path.join(assetsRoot, slug);
      const destRel = path.posix.join('/assets/posts', slug, filename);
      const destPath = path.join(assetDir, filename);
      await downloadFile(url, destPath);
      assetFiles.push({ filename, path: destPath, url: destRel });
      body = body.replace(url, destRel);
    } catch (err) {
      console.warn('asset download failed:', err.message);
    }
  }

  const comments = await fetchComments(repo, id);

  const out = {
    id,
    title,
    slug,
    author: { login: issue.user?.login || null, id: issue.user?.id || null, url: issue.user?.html_url || null },
    created_at: issue.created_at,
    updated_at: issue.updated_at || issue.created_at,
    body,
    comments,
    labels,
    tags,
    main_category: labels.find(l => !LABELS.includes(l)) || null,
    post_type: 'article',
    media: assetFiles.map(a => ({ type: 'image', filename: a.filename, url: a.url })),
    assets: assetFiles.map(a => ({ path: a.path, url: a.url })),
    excerpt: (issue.body && issue.body.split('\n').find(l => l.trim())?.slice(0, 200)) || '',
    draft: labels.includes('draft') || false,
    custom: {}
  };

  const outPath = path.join(outDir, `${slug}.json`);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + os.EOL);
  return { outPath, assets: assetFiles };
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    console.error('GITHUB_REPOSITORY is not set. This script is intended to run in GitHub Actions in the content repo.');
    process.exit(2);
  }

  console.log('Generating posts from', repo, 'labels=', LABELS);
  const labelsQuery = LABELS.map(encodeURIComponent).join(',');
  const issues = await api(`/repos/${repo}/issues?state=open&labels=${labelsQuery}&per_page=100`);
  if (!Array.isArray(issues)) {
    console.error('unexpected issues response', issues);
    process.exit(2);
  }

  const workDir = path.join(process.cwd(), 'tmp_generated_posts');
  const outDataDir = path.join(workDir, 'src', '_data', 'posts');
  const outAssetsDir = path.join(workDir, 'src', 'assets', 'posts');
  await fs.rm(workDir, { recursive: true, force: true });
  await fs.mkdir(outDataDir, { recursive: true });

  console.log(`Found ${issues.length} issues`);
  for (const issue of issues) {
    if (issue.pull_request) continue;
    try {
      await processIssue(repo, issue, outDataDir, outAssetsDir);
    } catch (err) {
      console.error('error processing issue', issue.number, err.message);
    }
  }

  // Clone hosting repo and copy generated files
  const tmpHostDir = path.join(os.tmpdir(), `hosting-repo-${Date.now()}`);
  const hostingUrl = `https://${HOSTING_PUSH_TOKEN}@github.com/${HOSTING_REPO}.git`;
  console.log('Cloning hosting repo', HOSTING_REPO);
  execSync(`git clone --depth=1 ${hostingUrl} ${tmpHostDir}`, { stdio: 'inherit' });

  const targetDataDir = path.join(tmpHostDir, 'src', '_data', 'posts');
  const targetAssetsDir = path.join(tmpHostDir, 'src', 'assets', 'posts');
  await fs.mkdir(targetDataDir, { recursive: true });
  await fs.mkdir(targetAssetsDir, { recursive: true });

  // copy files
  execSync(`cp -r ${path.join(outDataDir, '*')} ${targetDataDir}/ || true`, { stdio: 'inherit' });
  execSync(`cp -r ${path.join(outAssetsDir, '*')} ${targetAssetsDir}/ || true`, { stdio: 'inherit' });

  // Commit & push
  try {
    execSync(`cd ${tmpHostDir} && git add src/_data/posts src/assets/posts || true && git commit -m "chore: update generated posts from content repo" || true`, { stdio: 'inherit' });
    execSync(`cd ${tmpHostDir} && git push origin HEAD:main`, { stdio: 'inherit' });
    console.log('Pushed generated content to hosting repo');
  } catch (err) {
    console.error('failed to commit/push to hosting repo:', err.message);
    process.exit(2);
  }
}

main().catch(err => { console.error(err); process.exit(2); });
