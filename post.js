(() => {
  const qs = new URLSearchParams(window.location.search);
  const id = qs.get("id");
  const view = qs.get("view"); // "pdf" | "md" | null
  const INDEX_PATH = "topics/index.json";

  const titleEl = document.getElementById("post-title");
  const metaEl = document.getElementById("post-meta");
  const actionsEl = document.getElementById("post-actions");
  const errorWrap = document.getElementById("post-error");
  const errorText = document.getElementById("post-error-text");
  const mdWrap = document.getElementById("post-body");
  const pdfWrap = document.getElementById("post-pdf");

  const showError = (message) => {
    if (titleEl) titleEl.textContent = "Post not found";
    if (errorText) errorText.textContent = message;
    if (errorWrap) errorWrap.hidden = false;
    if (mdWrap) mdWrap.hidden = true;
    if (pdfWrap) pdfWrap.hidden = true;
  };

  const isProbablyRelative = (url) => {
    if (!url) return false;
    if (url.startsWith("http://") || url.startsWith("https://")) return false;
    if (url.startsWith("data:")) return false;
    if (url.startsWith("mailto:")) return false;
    if (url.startsWith("#")) return false;
    if (url.startsWith("/")) return false;
    return true;
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  const extractMarkdownTitle = (md) => {
    if (!md) return null;
    const lines = String(md).split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^#\s+(.+?)\s*$/);
      if (m) return m[1].trim();
      if (!line.startsWith("<!--")) break;
    }
    return null;
  };

  const setPageTitle = (t) => {
    const title = t || "Post";
    if (titleEl) titleEl.textContent = title;
    document.title = `${title} | Scorpion Labs`;
  };

  const renderMetaAndActions = (post, available) => {
    const dateText = formatDate(post.date);
    const tags = Array.isArray(post.tags) ? post.tags : [];

    if (metaEl) {
      metaEl.innerHTML = "";

      const metaBits = [];
      if (dateText) metaBits.push(dateText);
      if (post.pillar) metaBits.push(String(post.pillar).toUpperCase());
      if (post.format) metaBits.push(String(post.format).toUpperCase());

      const metaLine = document.createElement("div");
      metaLine.className = "post-meta-line";
      metaLine.textContent = metaBits.filter(Boolean).join(" · ");
      metaEl.appendChild(metaLine);

      if (tags.length) {
        const tagsEl = document.createElement("div");
        tagsEl.className = "post-tags";
        tags.forEach((tag) => {
          const chip = document.createElement("span");
          chip.className = "tag-chip";
          chip.textContent = String(tag);
          tagsEl.appendChild(chip);
        });
        metaEl.appendChild(tagsEl);
      }
    }

    if (actionsEl) {
      actionsEl.innerHTML = "";

      const hubMap = {
        mech_int: "mechint",
        ml_sys: "mlsys",
        historical_ai: "historical"
      };

      if (available?.md) {
        const read = document.createElement("a");
        read.className = "btn btn-primary";
        read.href = `post.html?id=${encodeURIComponent(post.id)}`;
        read.textContent = "Read";
        actionsEl.appendChild(read);
      }

      if (available?.pdf) {
        const pdf = document.createElement("a");
        pdf.className = "btn btn-secondary";
        pdf.href = `post.html?id=${encodeURIComponent(post.id)}&view=pdf`;
        pdf.textContent = "View PDF";
        actionsEl.appendChild(pdf);
      }

      if (post.pillar && hubMap[post.pillar]) {
        const hubLink = document.createElement("a");
        hubLink.className = "btn btn-secondary";
        hubLink.href = `${hubMap[post.pillar]}.html#writing`;
        hubLink.textContent = "Back to hub";
        actionsEl.appendChild(hubLink);
      }
    }
  };

  const renderPdf = (basePath, fileName, post) => {
    if (!pdfWrap) return;
    pdfWrap.innerHTML = "";

    const pdfUrl = `${basePath}${fileName}`;

    const embed = document.createElement("iframe");
    embed.className = "pdf-embed";
    embed.src = pdfUrl;
    embed.title = post.title ? `${post.title} (PDF)` : "Post PDF";

    const fallback = document.createElement("p");
    fallback.className = "post-fallback";
    fallback.innerHTML = `If the PDF doesn't load, <a class="external-link" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">open it in a new tab</a>.`;

    pdfWrap.appendChild(embed);
    pdfWrap.appendChild(fallback);
    pdfWrap.hidden = false;
    if (mdWrap) mdWrap.hidden = true;
  };

  const rewriteRelativeAssets = (root, basePath) => {
    root.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (isProbablyRelative(src)) {
        img.setAttribute("src", `${basePath}${src}`);
      }
    });

    root.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (isProbablyRelative(href)) {
        a.setAttribute("href", `${basePath}${href}`);
      }
      if (a.getAttribute("target") === "_blank") return;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    });
  };

  const highlightCode = (root) => {
    if (!window.hljs) return;
    root.querySelectorAll("pre code").forEach((code) => {
      window.hljs.highlightElement(code);
    });
  };

  const renderMarkdown = async (basePath, fileName, post) => {
    if (!mdWrap) return;
    mdWrap.innerHTML = "";

    const mdUrl = `${basePath}${fileName}`;

    const resp = await fetch(mdUrl, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`Could not load markdown: ${mdUrl}`);
    }
    const md = await resp.text();

    const mdTitle = extractMarkdownTitle(md);
    if (mdTitle) setPageTitle(mdTitle);

    if (!window.marked) {
      throw new Error("Markdown renderer (marked) failed to load.");
    }

    window.marked.setOptions({
      gfm: true,
      breaks: false,
      mangle: false,
      headerIds: false
    });

    const html = window.marked.parse(md);

    const article = document.createElement("article");
    article.className = "post-content";
    article.innerHTML = html;

    rewriteRelativeAssets(article, basePath);
    highlightCode(article);

    mdWrap.appendChild(article);
    mdWrap.hidden = false;
    if (pdfWrap) pdfWrap.hidden = true;
  };

  const fetchIndexEntry = async (topicId) => {
    try {
      const resp = await fetch(INDEX_PATH, { cache: "no-store" });
      if (!resp.ok) return null;
      const index = await resp.json();
      const topics = Array.isArray(index?.topics) ? index.topics : [];
      return topics.find((t) => t?.id === topicId) || null;
    } catch {
      return null;
    }
  };

  const urlExists = async (url) => {
    try {
      const head = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (head.ok) return true;
    } catch {
      // ignore
    }
    try {
      const get = await fetch(url, { cache: "no-store" });
      return get.ok;
    } catch {
      return false;
    }
  };

  const detectAvailable = async (basePath, entry) => {
    const mdFile = entry?.file || "notes.md";
    const pdfFile = entry?.pdf || "notes.pdf";

    const mdUrl = `${basePath}${mdFile}`;
    const pdfUrl = `${basePath}${pdfFile}`;

    const md = await urlExists(mdUrl);
    const pdf = await urlExists(pdfUrl);

    return {
      md: md ? mdFile : null,
      pdf: pdf ? pdfFile : null
    };
  };

  const pickFileFromIndexOrProbe = async (basePath, entry) => {
    const available = await detectAvailable(basePath, entry);

    if (view === "pdf" && available.pdf) return { format: "pdf", file: available.pdf, available };
    if (view === "md" && available.md) return { format: "md", file: available.md, available };

    if (available.md) return { format: "md", file: available.md, available };
    if (available.pdf) return { format: "pdf", file: available.pdf, available };

    // legacy fallbacks
    const legacy = [
      { format: "md", file: "post.md" },
      { format: "pdf", file: "post.pdf" }
    ];
    for (const cand of legacy) {
      if (await urlExists(`${basePath}${cand.file}`)) return { ...cand, available: { md: null, pdf: null } };
    }

    return { format: "none", file: "", available };
  };

  const run = async () => {
    if (!id) {
      showError("Missing `id` query parameter. Example: post.html?id=mech_int/arena/1.4.1_indirect_object_id/bizzaroworld-initial-summary");
      return;
    }

    const normalizedId = id.replace(/^\/+/, "").replace(/\/+$/, "");
    const basePath = `topics/${normalizedId}/`;

    const indexEntry = (await fetchIndexEntry(normalizedId)) || {};
    const post = {
      id: normalizedId,
      pillar: indexEntry.pillar,
      title: indexEntry.title || normalizedId.split("/").slice(-1)[0],
      date: indexEntry.date,
      tags: indexEntry.tags,
      format: indexEntry.format,
      file: indexEntry.file
    };

    setPageTitle(post.title || "Untitled post");

    const picked = await pickFileFromIndexOrProbe(basePath, indexEntry);
    renderMetaAndActions(post, picked.available);

    try {
      if (picked.format === "none") {
        showError("Coming soon — no notes published for this topic yet.");
        return;
      }

      if (picked.format === "pdf") {
        // If markdown exists, use its title even when viewing the PDF.
        if (picked.available?.md) {
          try {
            const mdResp = await fetch(`${basePath}${picked.available.md}`, { cache: "no-store" });
            if (mdResp.ok) {
              const md = await mdResp.text();
              const mdTitle = extractMarkdownTitle(md);
              if (mdTitle) setPageTitle(mdTitle);
            }
          } catch {
            // ignore
          }
        }
        renderPdf(basePath, picked.file, post);
      } else {
        await renderMarkdown(basePath, picked.file, post);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to render post.");
    }
  };

  run();
})();

