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

  const renderHtmlWithRewrites = async (htmlUrl, baseHref) => {
    if (!iframe) return;

    const resp = await fetch(htmlUrl, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`Could not load HTML: ${htmlUrl}`);
    }

    let html = await resp.text();

    // Ensure relative assets resolve against the post folder.
    // (This also helps with Quarto libs and any relative links.)
    const baseTag = `<base href="${baseHref}">`;
    if (/<base\s/i.test(html)) {
      html = html.replace(/<base\b[^>]*>/i, baseTag);
    } else {
      html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${baseTag}`);
    }

    // Quarto sometimes emits assets under "<Title>_files/..." while our copied folder is "post_files/...".
    // If the post folder contains post_files/, rewrite any "*_files/" references to "post_files/".
    const postFilesExists = await urlExists(`${baseHref}post_files/`);
    if (postFilesExists) {
      html = html.replace(/(["'])(?!https?:\/\/)([^"']+?)_files\//g, "$1post_files/");
    }

    // Rewrite common Quarto image patterns when images are stored within the post directory.
    // Example: ../../images/foo.png -> images/foo.png
    html = html.replace(/(["'])(?:\.\.\/){2}images\//g, "$1images/");

    iframe.removeAttribute("src");
    iframe.srcdoc = html;
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
      historical: "historical.html#writing"
    };

    if (backEl && hubMap[pillar]) {
      backEl.href = hubMap[pillar];
      backEl.hidden = false;
    }

    const base = `posts/${id}/`;
    const htmlUrl = `${base}post.html`;
    const pdfUrl = `${base}post.pdf`;

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

    const setSrc = (mode) => {
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
        iframe.removeAttribute("src");
        iframe.removeAttribute("srcdoc");
        // Render HTML via srcdoc so we can fix relative paths without re-rendering Quarto outputs.
        renderHtmlWithRewrites(htmlUrl, base)
          .catch(() => {
            // Fallback: navigate directly (may still work if assets are correct).
            iframe.src = htmlUrl;
          });
        iframe.title = "Post HTML";
      }
      setActive(mode === "pdf" ? "pdf" : "read");
    };

    if (frameWrap) frameWrap.hidden = false;
    if (errorWrap) errorWrap.hidden = true;

    if (metaEl) metaEl.textContent = id;
    if (titleEl) titleEl.textContent = id.split("/").slice(-1)[0];
    document.title = `Viewer — ${id} | Scorpion Labs`;

    toggleRead?.addEventListener("click", () => {
      if (hasHtml) setSrc("read");
    });
    togglePdf?.addEventListener("click", () => {
      if (hasPdf) setSrc("pdf");
    });

    setSrc(initialMode);
  };

  run();
})();

