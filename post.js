(() => {
  const qs = new URLSearchParams(window.location.search);
  const id = qs.get("id");
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

  const renderMetaAndActions = (post) => {
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

  const pickFileFromIndexOrProbe = async (basePath, entry) => {
    const format = entry?.format;
    const file = entry?.file;
    if (format && file) return { format, file };

    const candidates = [
      { format: "md", file: "notes.md" },
      { format: "pdf", file: "notes.pdf" },
      { format: "md", file: "post.md" },
      { format: "pdf", file: "post.pdf" }
    ];

    for (const cand of candidates) {
      try {
        const resp = await fetch(`${basePath}${cand.file}`, { cache: "no-store" });
        if (resp.ok) return cand;
      } catch {
        // ignore
      }
    }

    return null;
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

    if (titleEl) titleEl.textContent = post.title || "Untitled post";
    document.title = post.title ? `${post.title} | Scorpion Labs` : "Post | Scorpion Labs";

    renderMetaAndActions(post);

    try {
      const picked = await pickFileFromIndexOrProbe(basePath, indexEntry);
      if (!picked) {
        showError(`No readable file found in ${basePath}. Expected notes.md or notes.pdf (or specify file/format in topics/index.json).`);
        return;
      }

      if (picked.format === "pdf") {
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

