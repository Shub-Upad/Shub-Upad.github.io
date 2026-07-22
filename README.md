# Scorpion Labs

Public AI research lab. Mechanistic interpretability, ML systems, reinforcement learning, and personal thoughts on AI — documented in the open as the work happens.

Live at **[scorpionlabs.me](https://scorpionlabs.me)**

---

## What's Here

| Section | Description |
|---|---|
| **MechInt** | Mechanistic interpretability: circuit discovery, activation patching, sparse autoencoders, BizzaroWorld replications |
| **MLSys** | ML systems and infrastructure: GPU kernels, distributed training, quantization |
| **RL** | Reinforcement learning: policy optimization, reward models, RL × mech interp intersections |
| **Historical** | Historical AI techniques replicated with modern tooling |
| **Experiments** | Everything else: fine-tuning, VLMs, obscure papers worth rebuilding |
| **Replication** | Paper replication archive and methodology |
| **Residual Stream** | Personal thoughts on AI — named after the transformer mechanism that carries information forward |

---

## Tech Stack

- Pure HTML / CSS / JS — no framework, no build step
- Posts rendered via Quarto (`.qmd` → `post.html` + `post.pdf`)
- `posts/index.json` is the single source of truth for what appears on each hub
- `viewer.html` handles in-page iframe rendering of Quarto HTML output with asset path rewrites
- Deployed via GitHub Pages with custom domain `scorpionlabs.me`

---

## Adding a Post

1. Create a folder: `posts/<pillar>/<slug>/`
2. Put `post.html` and `post.pdf` inside it (Quarto output)
3. Rename Quarto's `<title>_files/` directory to `post_files/`
4. Register it in `posts/index.json`:

```json
{
  "id": "mechint/my-post-slug",
  "title": "My Post Title",
  "date": "2026-07-22",
  "pillar": "mechint",
  "has_html": true,
  "has_pdf": true
}
```

Valid pillars: `mechint`, `mlsys`, `rl`, `historical`, `experiments`, `residualstream`

---

## Design

- Dark minimal research aesthetic
- Accent: `#e8ff47`
- Fonts: Space Grotesk (headings) · DM Mono (body/code)
- Mobile-first with hamburger nav

---

## Philosophy

Ship experiments, not slide decks. Every idea gets built. Every build gets documented. Every failure is more interesting than the success it precedes.
