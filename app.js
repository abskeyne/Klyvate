(() => {
  "use strict";

  const categories = {
    images: { name: "Images", icon: "image" },
    text: { name: "Text", icon: "type" },
    data: { name: "Developer & data", icon: "code" },
    everyday: { name: "Everyday", icon: "calendar" },
  };

  const catalog = [
    ["image-resize", "images", "Image Resize", "Set exact pixel dimensions or scale to fit.", "resize", "photo resizer dimensions width height scale"],
    ["image-compress", "images", "Image Compress", "Reduce image size with an adjustable quality setting.", "compress", "shrink optimize reduce jpg jpeg webp kb mb"],
    ["image-convert", "images", "Image Convert", "Switch between PNG, JPEG, and WebP.", "convert", "format conversion jpg png jpeg webp"],
    ["image-rotate-flip", "images", "Image Rotate & Flip", "Turn an image 90° or mirror it on either axis.", "rotate", "rotation clockwise mirror flip photo"],
    ["image-to-base64", "images", "Image to Base64", "Encode an image as a data URL or plain Base64.", "image", "base64 file embed data uri"],
    ["word-character-counter", "text", "Word & Character Counter", "Count words, characters, lines, and reading time as you type.", "count", "wordcount character count letter length reading time"],
    ["case-converter", "text", "Case Converter", "Change text to upper, lower, title, or sentence case.", "type", "capitalize caps lowercase uppercase titlecase"],
    ["remove-duplicate-lines", "text", "Remove Duplicate Lines", "Keep the first occurrence of each line.", "dedupe", "deduplicate repeated unique list"],
    ["text-sorter", "text", "Text Sorter", "Put lines in alphabetical or numeric order.", "sort", "alphabetize sorting ascending descending list"],
    ["find-replace", "text", "Find & Replace", "Replace the first match or every occurrence of a phrase.", "search", "substitute edit replace all"],
    ["text-difference-checker", "text", "Text Difference Checker", "Compare two texts and see exactly which lines changed.", "diff", "diff compare revisions changes"],
    ["json-formatter-validator", "data", "JSON Formatter & Validator", "Check syntax, add indentation, or minify JSON.", "braces", "pretty print prettify stringify compact json lint"],
    ["base64-text", "data", "Base64 Text Encoder/Decoder", "Encode Unicode text as Base64 and decode it back.", "code", "base 64 utf-8 unicode b64"],
    ["url-encoder-decoder", "data", "URL Encoder/Decoder", "Encode or decode query values and other URL components.", "link", "uri escape unescape percent encode query"],
    ["csv-json-converter", "data", "CSV ↔ JSON Converter", "Convert between CSV with headers and JSON objects.", "table", "spreadsheet comma separated values csv to json json to csv"],
    ["sha-256-file-hash", "data", "SHA-256 File Hash", "Calculate a SHA-256 checksum for a local file.", "hash", "sha256 sha 256 digest checksum verify file"],
    ["percentage-calculator", "everyday", "Percentage Calculator", "Find a percentage, proportion, or percent change.", "percent", "percent of math percent increase decrease discount"],
    ["date-difference-calculator", "everyday", "Date Difference Calculator", "Find the number of calendar days between two dates.", "calendar", "duration days between dates date diff"],
  ].map(([slug, category, name, description, glyph, aliases]) => ({
    slug, category, name, description, glyph,
    search: normalizeSearch(`${name} ${categories[category].name} ${description} ${aliases}`),
  }));

  const paths = {
    image: "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm-1 13 5-5 4 4 3-3 6 6M16 8a1 1 0 1 0 .01 0",
    resize: "M9 3H4a1 1 0 0 0-1 1v5m12-6h5a1 1 0 0 1 1 1v5M3 15v5a1 1 0 0 0 1 1h5m6 0h5a1 1 0 0 0 1-1v-5M8 16l8-8m-4 0h4v4",
    compress: "M7 3v4H3m0-3 4 3m10-4v4h4m0-3-4 3M7 21v-4H3m0 3 4-3m10 4v-4h4m0 3-4-3M10 10h4v4h-4z",
    convert: "M4 8h15m-4-4 4 4-4 4m5 4H5m4-4-4 4 4 4",
    rotate: "M4 9a8 8 0 1 1 1 8M4 4v5h5m1 2h5v5h-5z",
    type: "M4 5h16M12 5v14m-3 0h6M4 5v3m16-3v3",
    count: "M4 6h11M4 11h9m-9 5h9m3 1h5m-2.5-2.5v5",
    dedupe: "M7 4h13M7 9h13M7 14h6M7 19h6M3 4h.1M3 9h.1M3 14h.1m13 3 2 2 3-4",
    sort: "M5 4v16m-3-3 3 3 3-3m4-12h9m-9 5h7m-7 5h5m-5 5h3",
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4",
    diff: "M3 6h6m-3-3v6m9-3h6M3 15h6m-6 5h6m6-5h6m-6 5h6",
    code: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16",
    braces: "M9 3H7a2 2 0 0 0-2 2v4a3 3 0 0 1-3 3 3 3 0 0 1 3 3v4a2 2 0 0 0 2 2h2m6-18h2a2 2 0 0 1 2 2v4a3 3 0 0 0 3 3 3 3 0 0 0-3 3v4a2 2 0 0 1-2 2h-2",
    link: "m10 14 4-4m-5 6-2 2a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 6a3.5 3.5 0 0 0 5 0l4-4a3.5 3.5 0 0 0-5-5l-2 2",
    table: "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM3 9h18M3 15h18M10 9v11",
    hash: "M5 9h15M4 15h15M11 4 8 20m8-16-3 16",
    percent: "m5 19 14-14M7.5 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm9 9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
    calendar: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3-2v4m8-4v4M4 10h16m-12 5h2m4 0h2",
    grid: "M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z",
    star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    back: "M19 12H5m6 6-6-6 6-6",
    clear: "m6 6 12 12M18 6 6 18",
    shield: "M12 3c3 2 5 2.5 8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6c3-.5 5-1 8-3Zm-3 9 2 2 4-4",
    moon: "M20.8 14a8.9 8.9 0 0 1-11-10.8A9 9 0 1 0 20.8 14Z",
    sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.5 1.5m9.8 9.8 1.5 1.5m0-12.8-1.5 1.5m-9.8 9.8-1.5 1.5",
    upload: "M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4",
    copy: "M8 8h12v12H8zm8-3V4H4v12h1",
    download: "M12 4v12m-4-4 4 4 4-4M4 17v3h16v-3",
  };

  const main = document.querySelector("#main");
  const themeButton = document.querySelector("#theme-toggle");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const filterState = { category: "all", query: "", favoritesOnly: false };
  const bySlug = new Map(catalog.map((item) => [item.slug, item]));
  const favoritesKey = "klyvate.favorites";
  const themeKey = "klyvate.theme";

  let theme = getPreference(themeKey);
  let activeView;
  let homeSearch;
  const favorites = readFavorites();

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [attribute, value] of Object.entries({
      viewBox: "0 0 24 24", width: "24", height: "24", fill: "none",
      stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round",
      "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false",
    })) svg.setAttribute(attribute, value);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[name]);
    svg.append(path);
    return svg;
  }

  function link(text, href, className) {
    const element = node("a", className, text);
    element.href = href;
    return element;
  }

  function button(text, className) {
    const element = node("button", className, text);
    element.type = "button";
    return element;
  }

  function getPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function setPreference(key, value) {
    try { localStorage.setItem(key, value); } catch { /* In-memory preferences still work. */ }
  }

  function readFavorites() {
    try {
      const stored = JSON.parse(getPreference(favoritesKey));
      if (Array.isArray(stored)) return new Set(stored.filter((slug) => bySlug.has(slug)));
    } catch { /* Ignore invalid stored preferences. */ }
    return new Set();
  }

  function applyTheme() {
    const dark = theme === "dark" || (theme !== "light" && systemTheme.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').content = dark ? "#151917" : "#FAFAF8";
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.title = dark ? "Switch to light mode" : "Switch to dark mode";
    themeButton.replaceChildren(icon(dark ? "sun" : "moon"));
  }

  function favoriteButton(item, className, onChange) {
    const toggle = button("", className);
    toggle.setAttribute("aria-label", `Favorite ${item.name}`);
    toggle.append(icon("star"));
    if (className.includes("tool-favorite")) toggle.append(node("span", "", "Favorite"));

    function update() {
      const saved = favorites.has(item.slug);
      toggle.setAttribute("aria-pressed", String(saved));
      toggle.title = saved ? "Remove from favorites" : "Add to favorites";
    }

    update();
    toggle.addEventListener("click", () => {
      if (favorites.has(item.slug)) favorites.delete(item.slug);
      else favorites.add(item.slug);
      setPreference(favoritesKey, JSON.stringify([...favorites]));
      update();
      onChange?.();
    });
    return toggle;
  }

  function normalizeSearch(text) {
    return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function makeToolCard(item, whenFavoriteChanges) {
    const card = node("article", `tool-card tone-${item.category}`);
    const top = node("div", "card-top");
    const badge = node("span", "tool-icon");
    badge.append(icon(item.glyph));
    top.append(badge, favoriteButton(item, "icon-button card-favorite", whenFavoriteChanges));

    const title = node("h4", "card-title");
    const anchor = link(item.name, `#/tools/${item.slug}`, "card-link");
    title.append(anchor, icon("arrow"));
    card.append(top, title, node("p", "card-description", item.description));
    return card;
  }

  function renderHome() {
    const hero = node("section", "hero");
    const intro = node("div", "hero-intro");
    const heading = node("h1", "", "Useful tools.");
    heading.append(document.createElement("br"), node("span", "hero-accent", "No fuss."));
    intro.append(heading, node("p", "hero-description", "Resize images, tidy up text, convert data, and make quick calculations in your browser."));

    const searchForm = node("form", "search-form");
    searchForm.setAttribute("role", "search");
    const search = node("input", "search-input");
    search.type = "search";
    search.id = "tool-search";
    search.placeholder = "Search tools…";
    search.autocomplete = "off";
    search.value = filterState.query;
    const label = node("label", "visually-hidden", "Search tools");
    label.htmlFor = search.id;
    const clear = button("", "icon-button search-clear");
    clear.setAttribute("aria-label", "Clear search");
    clear.append(icon("clear"));
    const shortcut = node("kbd", "search-shortcut", "/");
    shortcut.setAttribute("aria-hidden", "true");
    searchForm.append(label, icon("search"), search, clear, shortcut);

    const assurance = node("p", "hero-assurance");
    assurance.append(icon("shield"), node("span", "", "Files and text stay on this device."));
    intro.append(searchForm, assurance);

    const graphic = node("div", "hero-graphic");
    graphic.setAttribute("aria-hidden", "true");
    for (const [category, name] of [["images", "resize"], ["text", "type"], ["data", "braces"], ["everyday", "percent"]]) {
      const tile = node("span", `hero-tile tone-${category}`);
      tile.append(icon(name));
      graphic.append(tile);
    }
    hero.append(intro, graphic);

    const directory = node("section", "directory");
    directory.setAttribute("aria-labelledby", "directory-title");
    const titleRow = node("div", "directory-title-row");
    const title = node("h2", "", "Tool directory");
    title.id = "directory-title";
    const count = node("p", "tool-count");
    count.setAttribute("role", "status");
    titleRow.append(title, count);
    const toolbar = node("div", "toolbar");
    const group = node("div", "filters");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Filter tools by category");
    const choices = Object.entries({ all: { name: "All tools", icon: "grid" }, ...categories });
    const filters = choices.map(([key, category]) => {
      const chip = button("", "chip");
      chip.append(icon(category.icon), node("span", "", category.name));
      chip.addEventListener("click", () => {
        filterState.category = key;
        update();
      });
      group.append(chip);
      return [key, chip];
    });
    const favoriteFilter = button("", "chip favorites-filter");
    favoriteFilter.append(icon("star"), node("span", "", "Favorites"));
    favoriteFilter.addEventListener("click", () => {
      filterState.favoritesOnly = !filterState.favoritesOnly;
      update();
    });
    toolbar.append(group, favoriteFilter);

    const results = node("div", "directory-results");
    directory.append(titleRow, toolbar, results);
    main.append(hero, directory);
    homeSearch = search;

    let firstVisible;

    function showEmpty() {
      const empty = node("div", "empty-state");
      const savedFilterOnly = filterState.favoritesOnly && !filterState.query && filterState.category === "all";
      const action = button(savedFilterOnly ? "Browse all tools" : "Clear filters", "button secondary");
      action.addEventListener("click", () => {
        filterState.query = "";
        filterState.category = "all";
        filterState.favoritesOnly = false;
        search.value = "";
        update();
        search.focus();
      });
      empty.append(
        icon(savedFilterOnly ? "star" : "search"),
        node("h3", "", savedFilterOnly ? "No favorites yet" : "No tools found"),
        node("p", "", savedFilterOnly
          ? "Use the star on any tool to save it here."
          : "Try a different search or clear your filters."),
        action,
      );
      results.append(empty);
    }

    function update() {
      const terms = normalizeSearch(filterState.query).split(" ").filter(Boolean);
      const matches = catalog.filter((item) =>
        (filterState.category === "all" || item.category === filterState.category) &&
        (!filterState.favoritesOnly || favorites.has(item.slug)) &&
        terms.every((term) => item.search.includes(term)));
      firstVisible = matches[0];
      const summary = `${matches.length} ${matches.length === 1 ? "tool" : "tools"}`;
      if (count.textContent !== summary) count.textContent = summary;
      for (const [key, chip] of filters) chip.setAttribute("aria-pressed", String(key === filterState.category));
      favoriteFilter.setAttribute("aria-pressed", String(filterState.favoritesOnly));
      clear.hidden = search.value === "";
      shortcut.hidden = search.value !== "";
      results.replaceChildren();

      if (!matches.length) {
        showEmpty();
        return;
      }

      for (const [key, category] of Object.entries(categories)) {
        const items = matches.filter((item) => item.category === key);
        if (!items.length) continue;
        const section = node("section", "tool-group");
        const heading = node("h3", "group-title", category.name);
        const grid = node("div", "tool-grid");
        function refreshFavorites() {
          if (filterState.favoritesOnly) {
            update();
            (results.querySelector(".card-favorite") || favoriteFilter).focus();
          }
        }
        for (const item of items) grid.append(makeToolCard(item, refreshFavorites));
        section.append(heading, grid);
        results.append(section);
      }
    }

    search.addEventListener("input", () => {
      filterState.query = search.value;
      update();
    });
    clear.addEventListener("click", () => {
      search.value = "";
      filterState.query = "";
      update();
      search.focus();
    });
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (firstVisible) location.hash = `#/tools/${firstVisible.slug}`;
    });
    update();
  }

  function backLink() {
    const back = link("All tools", "#/", "back-link");
    back.prepend(icon("back"));
    return back;
  }

  function renderTool(item, signal) {
    const page = node("div", "tool-page");
    const breadcrumbs = node("nav", "breadcrumbs");
    breadcrumbs.setAttribute("aria-label", "Breadcrumb");
    breadcrumbs.append(backLink(), node("span", "breadcrumb-category", categories[item.category].name));

    const head = node("div", "tool-heading");
    const badge = node("span", `tool-icon tone-${item.category}`);
    badge.append(icon(item.glyph));
    const title = node("div", "tool-heading-copy");
    title.append(node("h1", "", item.name), node("p", "", item.description));
    head.append(badge, title, favoriteButton(item, "button secondary tool-favorite"));

    const panel = node("div", "tool-panel");
    page.append(breadcrumbs, head, panel);
    main.append(page);
    window.KlyvateTools.mount(item.slug, panel, { signal, icon });
  }

  function renderInfo(route) {
    const page = node("article", "info-page");
    page.append(backLink());
    if (route === "#/about") {
      page.append(
        node("h1", "", "About Klyvate"),
        node("p", "info-lead", "Klyvate is a free collection of everyday tools for images, text, data, and quick calculations."),
        node("p", "", "Open a tool, add your input, and copy or download the result. The tools work offline after you download the site and open index.html in a modern browser."),
        link("Read the privacy page", "#/privacy", "text-link"),
      );
    } else if (route === "#/privacy") {
      page.append(
        node("h1", "", "Privacy"),
        node("p", "info-lead", "Klyvate processes the files and text you choose in your browser. It does not upload them."),
        node("h2", "", "What stays on your device"),
        node("p", "", "Your input and results are held in the current tab while you use a tool. Klyvate uses browser storage only for your theme and favorite tools, when storage is available."),
        node("h2", "", "How the site works"),
        node("p", "", "There are no accounts, payments, ads, analytics, or tracking scripts. The hosted site serves static files such as HTML, CSS, and JavaScript. No tool sends your input back to the host."),
        node("p", "", "Your browser, extensions, and device settings can affect how local files, downloads, and clipboard contents are handled."),
      );
    } else {
      page.append(
        node("h1", "", "Page not found"),
        node("p", "info-lead", "This address does not match a Klyvate tool or page."),
        link("Browse tools", "#/", "button primary"),
      );
    }
    main.append(page);
  }

  function renderRoute(moveFocus) {
    activeView?.abort();
    activeView = new AbortController();
    homeSearch = null;
    main.replaceChildren();
    const route = location.hash || "#/";
    const tool = route.startsWith("#/tools/") && bySlug.get(route.slice(8));
    const home = route === "#/";
    const about = route === "#/about";

    const toolsNav = document.querySelector("#tools-nav");
    const aboutNav = document.querySelector("#about-nav");
    toolsNav.classList.toggle("is-current", home || Boolean(tool));
    aboutNav.classList.toggle("is-current", about);
    toolsNav.removeAttribute("aria-current");
    aboutNav.removeAttribute("aria-current");
    if (home) toolsNav.setAttribute("aria-current", "page");
    if (about) aboutNav.setAttribute("aria-current", "page");

    if (home) renderHome();
    else if (tool) renderTool(tool, activeView.signal);
    else renderInfo(route);

    const heading = main.querySelector("h1");
    document.title = home ? "Klyvate — Useful tools. No fuss." : `${heading.textContent} | Klyvate`;
    if (moveFocus) {
      window.scrollTo(0, 0);
      heading.tabIndex = -1;
      heading.focus();
    }
  }

  themeButton.addEventListener("click", () => {
    theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setPreference(themeKey, theme);
    applyTheme();
  });
  systemTheme.addEventListener("change", applyTheme);
  document.querySelector(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    main.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (!homeSearch || event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable]")) return;
    event.preventDefault();
    homeSearch.focus();
  });
  window.addEventListener("hashchange", () => renderRoute(true));

  document.querySelector("#year").textContent = new Date().getFullYear();
  applyTheme();
  themeButton.hidden = false;
  renderRoute(false);
})();
