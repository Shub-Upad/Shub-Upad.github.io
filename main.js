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
