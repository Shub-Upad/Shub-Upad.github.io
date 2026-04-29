(() => {
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelectorAll(".nav-links a");
  const dropdownTriggers = document.querySelectorAll(".nav-dropdown-trigger");

  if (!nav || !toggle) {
    return;
  }

  const closeMenu = () => {
    nav.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  dropdownTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (window.innerWidth > 980) {
        return;
      }

      const parent = trigger.closest(".nav-dropdown");
      if (!parent) {
        return;
      }

      const isOpen = parent.classList.toggle("nav-dropdown-open");
      trigger.setAttribute("aria-expanded", String(isOpen));
    });
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
      closeMenu();
      dropdownTriggers.forEach((trigger) => {
        trigger.setAttribute("aria-expanded", "false");
        const parent = trigger.closest(".nav-dropdown");
        parent?.classList.remove("nav-dropdown-open");
      });
    }
  });
})();

(() => {
  const INDEX_PATH = "topics/index.json";
  const INDEX_KEY = "topics";

  const formatDate = (iso) => {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  const renderPosts = (container, posts, hubSlug) => {
    if (!container) return;
    container.innerHTML = "";

    if (!posts.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = "<p>No posts yet. Add a folder under topics/ and register it in topics/index.json.</p>";
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "writing-grid";

    posts
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .forEach((post) => {
        const card = document.createElement("article");
        card.className = "writing-card post-card";
        card.tabIndex = 0;
        card.setAttribute("role", "link");

        const topline = document.createElement("p");
        topline.className = "writing-topline";
        const bits = [formatDate(post.date), (post.format || "").toUpperCase()].filter(Boolean);
        topline.textContent = bits.join(" · ");

        const h3 = document.createElement("h3");
        h3.className = "card-title";
        h3.textContent = post.title || post.id || "Untitled";

        const tagsWrap = document.createElement("div");
        tagsWrap.className = "post-tags";
        (Array.isArray(post.tags) ? post.tags : []).forEach((tag) => {
          const chip = document.createElement("span");
          chip.className = "tag-chip";
          chip.textContent = String(tag);
          tagsWrap.appendChild(chip);
        });

        const actions = document.createElement("div");
        actions.className = "post-card-actions";
        const link = document.createElement("a");
        link.className = "external-link";
        link.href = `post.html?id=${encodeURIComponent(post.id)}`;
        link.textContent = post.format === "pdf" ? "View PDF →" : "Read →";
        actions.appendChild(link);

        const navigate = () => {
          window.location.href = link.href;
        };

        card.addEventListener("click", (event) => {
          const target = event.target;
          if (target instanceof Element && target.closest("a")) return;
          navigate();
        });

        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate();
          }
        });

        card.appendChild(topline);
        card.appendChild(h3);
        if (tagsWrap.childElementCount) card.appendChild(tagsWrap);
        card.appendChild(actions);

        grid.appendChild(card);
      });

    container.appendChild(grid);
  };

  const boot = async () => {
    const mechint = document.getElementById("mechint-writing");
    const mlsys = document.getElementById("mlsys-writing");
    const historical = document.getElementById("historical-writing");

    if (!mechint && !mlsys && !historical) {
      return;
    }

    let index;
    try {
      const resp = await fetch(INDEX_PATH, { cache: "no-store" });
      if (!resp.ok) return;
      index = await resp.json();
    } catch {
      return;
    }

    const all = Array.isArray(index?.[INDEX_KEY]) ? index[INDEX_KEY] : [];

    if (mechint) renderPosts(mechint, all.filter((p) => p.pillar === "mech_int"), "mechint");
    if (mlsys) renderPosts(mlsys, all.filter((p) => p.pillar === "ml_sys"), "mlsys");
    if (historical) renderPosts(historical, all.filter((p) => p.pillar === "historical_ai"), "historical");
  };

  boot();
})();
