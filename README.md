# Welcome to `scribal.bible` website


[labels](https://github.com/joshualinog/scribal.bible/labels)

## why this project exists

This repository contains the website and templates for the Scribal Bible project.

## how to contribute to and interact with scribal Bible
- Just read, browse, and ponder.
- Use Issues as a conversation launchpad — add comments with multimedia (video, photos, text, audio).
- When assigned an issue, treat it as an invitation to contribute or comment; questions are welcome.

## Terminal & SSH notes

- Open a terminal per-folder in VS Code: right-click the desired folder in the Explorer and choose "Open in Integrated Terminal" so commands run in the intended repository.
- This workspace is configured to use SSH remotes. Ensure your SSH key is loaded (example): `ssh-add ~/.ssh/id_ed25519_codespace`.
- To run a command against the other repo without switching folders, use explicit paths or git/npm prefixes, e.g. `git -C /workspaces/content-creation-scribal-bible status` or `npm --prefix /workspaces/scribal.bible run build`.

## Deployment

This site is hosted on GitHub Pages with a custom domain (`scribal.bible`).

### DNS Setup (NameSilo)
In your NameSilo account, go to Domain Manager > `scribal.bible` > DNS Records, and add:

- **A Records for Apex Domain (`scribal.bible`)**:
  - Type: A
  - Name: `@`
  - Target: `185.199.108.153` (TTL: default)
  - Repeat for: `185.199.109.153`, `185.199.110.153`, `185.199.111.153`

- **CNAME for www Subdomain (`www.scribal.bible`)**:
  - Type: CNAME
  - Name: `www`
  - Target: `joshualinog.github.io` (TTL: default)

### GitHub Pages Settings
- Source: GitHub Actions
- Custom Domain: `scribal.bible`

DNS changes may take 1-24 hours to propagate.
