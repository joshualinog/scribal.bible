#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const GITHUB_API = 'https://api.github.com';
// If the content repository is different or private, set CONTENT_TOKEN with a PAT
const TOKEN = process.env.CONTENT_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const CONTENT_REPO = process.env.CONTENT_REPO || 'joshualinog/scribal.bible-CONTENT-CREATION';
const LABELS = (process.env.POST_LABELS || 'POST,isPost').split(',').map(s => s.trim()).filter(Boolean);
const OUT_DIR = path.resolve(process.cwd(), 'src', '_data', 'posts');
const ASSETS_ROOT = path.resolve(process.cwd(), 'src', 'assets', 'posts');

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
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'scribal-fetch-script'
  };
  if (TOKEN) headers['Authorization'] = `token ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub API error ${res.status} ${res.statusText}: ${txt}`);
  }
  return res.json();
}

async function downloadFile(url, destPath) {
  const headers = {};
  if (TOKEN) headers['Authorization'] = `token ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buf);
}

async function fetchComments(issueNumber) {
  const data = await api(`/repos/${CONTENT_REPO}/issues/${issueNumber}/comments`);
  return data.map(c => ({ author: c.user?.login || null, body: c.body || '', created_at: c.created_at }));
}

async function processIssue(issue) {
  const id = issue.number;
  const title = issue.title || `Post ${id}`;
  const slug = slugify(issue.title || `post-${id}`) + `-${id}`;
  const labels = (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name)).filter(Boolean);
  const tags = labels.filter(l => !['POST','isPost'].includes(l));

  let body = issue.body || '';

  // find image markdown and download assets
  const imgRegex = /!\[[^\]]*\]\((https?:[^)"']+)\)/g;
  const assetFiles = [];
  let m;
  while ((m = imgRegex.exec(body)) !== null) {
    try {
      const url = m[1];
      const urlObj = new URL(url);
      const filename = path.basename(urlObj.pathname) || `image-${Date.now()}.png`;
      const assetDir = path.join(ASSETS_ROOT, slug);
      const destRel = path.posix.join('/assets/posts', slug, filename);
      const destPath = path.join(assetDir, filename);
      await downloadFile(url, destPath);
      assetFiles.push({ filename, path: destPath, url: destRel });
      // rewrite URL in markdown to point to the local asset path
      body = body.replace(url, destRel);
    } catch (err) {
      console.warn('asset download failed:', err.message);
    }
  }

  const comments = await fetchComments(id);

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
    main_category: labels.find(l => l !== 'POST' && l !== 'isPost') || null,
    post_type: 'article',
    media: assetFiles.map(a => ({ type: 'image', filename: a.filename, url: a.url })),
    assets: assetFiles.map(a => ({ path: a.path, url: a.url })),
    excerpt: (issue.body && issue.body.split('\n').find(l => l.trim()).slice(0, 200)) || '',
    draft: labels.includes('draft') || false,
    custom: {}
  };

  const outPath = path.join(OUT_DIR, `${slug}.json`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + os.EOL);
  console.log(`Wrote ${outPath}`);
}

async function main() {
  console.log('Fetching issues from', CONTENT_REPO, 'labels=', LABELS);
  const labelsQuery = LABELS.map(encodeURIComponent).join(',');
  const issues = await api(`/repos/${CONTENT_REPO}/issues?state=open&labels=${labelsQuery}&per_page=100`);
  if (!Array.isArray(issues)) {
    console.error('unexpected issues response', issues);
    return;
  }
  console.log(`Found ${issues.length} issues`);
  for (const issue of issues) {
    // skip pull requests
    if (issue.pull_request) continue;
    try {
      await processIssue(issue);
    } catch (err) {
      console.error('error processing issue', issue.number, err.message);
    }
  }
}

main().catch(err => { console.error(err); process.exitCode = 2; });
