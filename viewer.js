(() => {
  const qs = new URLSearchParams(window.location.search);
  const idRaw = qs.get("id") || "";

  const titleEl = document.getElementById("viewer-title");
  const metaEl = document.getElementById("viewer-meta");
  const backEl = document.getElementById("viewer-back");
  const errorWrap = document.getElementById("viewer-error");
  const errorText = document.getElementById("viewer-error-text");
  const frameWrap = document.getElementById("viewer-frame");
  const iframe = document.getElementById("viewer-iframe");
  const fallback = document.getElementById("viewer-fallback");
  const toggleRead = document.getElementById("toggle-read");
  const togglePdf = document.getElementById("toggle-pdf");

  const showError = (message) => {
    if (errorText) errorText.textContent = message;
    if (errorWrap) errorWrap.hidden = false;
    if (frameWrap) frameWrap.hidden = true;
  };

  const normalizeId = (id) => String(id).replace(/^\/+/, "").replace(/\/+$/, "");

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

  const setIframeHtml = (html) => {
    if (!iframe) return;

    // If we previously loaded a blob URL, release it.
    const prev = iframe.dataset?.blobUrl;
    if (prev) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        // ignore
      }
      delete iframe.dataset.blobUrl;
    }

    // Use a Blob URL instead of srcdoc so <base href="..."> works reliably and
    // in-page hash navigation (e.g. footnotes) doesn't blow away the document.
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    iframe.dataset.blobUrl = blobUrl;
    iframe.src = blobUrl;
  };

  const attachDisableFootnoteClicks = () => {
    if (!iframe) return;
    let doc;
    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }
    if (!doc || doc.__scorpionFootnoteClicksDisabled) return;
    doc.__scorpionFootnoteClicksDisabled = true;

    doc.addEventListener(
      "click",
      (ev) => {
        const target = ev.target;
        const a = target instanceof Element ? target.closest("a") : null;
        if (!a) return;

        // In HTML mode, hover tooltips are enough; clicking footnotes can cause
        // confusing navigation inside the iframe. Disable clicks but preserve hover.
        const isFootnoteLink =
          a.classList.contains("footnote-ref") ||
          a.classList.contains("footnote-back") ||
          a.getAttribute("role") === "doc-noteref" ||
          a.getAttribute("role") === "doc-backlink";

        if (!isFootnoteLink) return;

        ev.preventDefault();
        ev.stopPropagation();
        if (typeof ev.stopImmediatePropagation === "function") {
          ev.stopImmediatePropagation();
        }
      },
      true
    );
  };

  const formatBylineDate = (iso) => {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const renderHtmlWithRewrites = async (htmlUrl, baseHref, postDate) => {
    if (!iframe) return;

    const resp = await fetch(htmlUrl, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`Could not load HTML: ${htmlUrl}`);
    }

    let html = await resp.text();

    // Ensure relative assets resolve against the post folder.
    // (This also helps with Quarto libs and any relative links.)
    // IMPORTANT: When we load HTML via a Blob URL, relative base hrefs would resolve against the
    // blob: URL (useless). So we force an absolute URL anchored to the current site origin.
    const absoluteBaseHref = new URL(baseHref, window.location.href).toString();
    const baseTag = `<base href="${absoluteBaseHref}">`;
    if (/<base\s/i.test(html)) {
      html = html.replace(/<base\b[^>]*>/i, baseTag);
    } else {
      html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${baseTag}`);
    }

    // Quarto sometimes emits assets under "<Title>_files/..." while our copied folder is "post_files/...".
    // Check a specific file (not a directory) since GitHub Pages returns 404 for bare directory URLs.
    const postFilesExists = await urlExists(`${baseHref}post_files/libs/quarto-html/quarto.js`);
    if (postFilesExists) {
      html = html.replace(/(["'])(?!https?:\/\/)([^"']+?)_files\//g, "$1post_files/");
    }

    // NOTE: We mirror ScorpionLabs Core's structure (repo-root `post_files/` + `images/`),
    // so we intentionally do NOT rewrite `../../../../images/...` (it should resolve to `/images/...`),
    // and we do NOT rewrite root-absolute `/post_files/...` references either.

    // Hide Quarto's auto-generated title block (duplicates the first content heading).
    // Inject a minimal byline after the first visible heading instead.
    const bylineDate = postDate ? formatBylineDate(postDate) : "";
    const bylineText = bylineDate ? `Subhanga Upadhyay · ${bylineDate}` : "Subhanga Upadhyay";
    const bylineStyle = `<style>
      #title-block-header{display:none!important}
      .scorpion-byline{font-family:ui-monospace,'DM Mono',monospace;font-size:.8rem;color:#888;margin:.25rem 0 1.5rem;padding-bottom:1rem;border-bottom:1px solid #dee2e6;letter-spacing:.02em}
    </style>`;
    const bylineHtml = `<p class="scorpion-byline">${bylineText}</p>`;
    // Inject after the first closing heading tag (the post's visible title h2/h1)
    html = html.replace(/(<\/h[1-6]>)/, `$1\n${bylineHtml}`);
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${bylineStyle}\n</head>`);
    }

    // Ensure anchor navigation is smooth.
    const smoothStyle = `<style>html{scroll-behavior:smooth}</style>`;
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${smoothStyle}\n</head>`);
    } else if (/<head(\s[^>]*)?>/i.test(html)) {
      html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${smoothStyle}`);
    }

    setIframeHtml(html);

    // Once the iframe document is available, disable footnote clicks (keep hover behavior).
    iframe.addEventListener("load", attachDisableFootnoteClicks, { once: true });
    queueMicrotask(() => attachDisableFootnoteClicks());
  };

  const setActive = (mode) => {
    const isRead = mode === "read";
    toggleRead?.classList.toggle("btn-primary", isRead);
    toggleRead?.classList.toggle("btn-secondary", !isRead);
    togglePdf?.classList.toggle("btn-primary", !isRead);
    togglePdf?.classList.toggle("btn-secondary", isRead);
  };

  const run = async () => {
    const id = normalizeId(idRaw);
    if (!id || !id.includes("/")) {
      showError("Missing or invalid `id`. Example: viewer.html?id=mechint/bizzaroworld-and-initial-summary");
      return;
    }

    const [pillar] = id.split("/");
    const hubMap = {
      mechint: "mechint.html#writing",
      mlsys: "mlsys.html#writing",
      historical: "historical.html#writing",
      residualstream: "residualstream.html#writing"
    };

    if (backEl && hubMap[pillar]) {
      backEl.href = hubMap[pillar];
      backEl.hidden = false;
    }

    const base = `posts/${id}/`;
    const htmlUrl = `${base}post.html`;
    const pdfUrl = `${base}post.pdf`;

    let postDate = "";
    try {
      const indexResp = await fetch("posts/index.json", { cache: "no-store" });
      if (indexResp.ok) {
        const index = await indexResp.json();
        const entry = (index?.posts || []).find((p) => normalizeId(p.id) === id);
        if (entry?.date) postDate = entry.date;
      }
    } catch { /* non-fatal */ }

    const hasHtml = await urlExists(htmlUrl);
    const hasPdf = await urlExists(pdfUrl);

    if (!hasHtml && !hasPdf) {
      showError(`Coming soon — no artifacts published at ${base}`);
      return;
    }

    if (toggleRead) toggleRead.disabled = !hasHtml;
    if (togglePdf) togglePdf.disabled = !hasPdf;

    const initialMode = (() => {
      const view = qs.get("view");
      if (view === "pdf" && hasPdf) return "pdf";
      if (view === "read" && hasHtml) return "read";
      if (hasHtml) return "read";
      return "pdf";
    })();

    const setSrc = async (mode) => {
      if (!iframe) return;
      if (fallback) fallback.hidden = true;

      if (mode === "pdf") {
        iframe.src = pdfUrl;
        iframe.removeAttribute("srcdoc");
        iframe.title = "Post PDF";
        if (fallback && hasPdf) {
          fallback.innerHTML =
            `If the PDF doesn't load, <a class="external-link" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">open it in a new tab</a>.`;
          fallback.hidden = false;
        }
      } else {
        iframe.title = "Post HTML";
        await renderHtmlWithRewrites(htmlUrl, base, postDate);
      }
      setActive(mode === "pdf" ? "pdf" : "read");
    };

    if (frameWrap) frameWrap.hidden = false;
    if (errorWrap) errorWrap.hidden = true;

    if (metaEl) metaEl.textContent = id;
    if (titleEl) titleEl.textContent = id.split("/").slice(-1)[0];
    document.title = `Viewer — ${id} | Scorpion Labs`;

    toggleRead?.addEventListener("click", async () => {
      if (hasHtml) await setSrc("read");
    });
    togglePdf?.addEventListener("click", async () => {
      if (hasPdf) await setSrc("pdf");
    });

    await setSrc(initialMode);
  };

  run();
})();

