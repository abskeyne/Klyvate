(() => {
  "use strict";

  const MiB = 1024 * 1024;
  const TEXT_LIMIT = 250000;
  const IMAGE_LIMIT = 20 * MiB;
  const PIXEL_LIMIT = 20000000;
  const DIMENSION_LIMIT = 10000;
  const BASE64_LIMIT = 2 * MiB;
  const HASH_LIMIT = 100 * MiB;
  let nextId = 0;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function action(text, className = "button secondary") {
    const button = el("button", className, text);
    button.type = "button";
    return button;
  }

  function field(label, input, help) {
    const wrapper = el("div", "field");
    input.id = `field-${++nextId}`;
    const caption = el("label", "", label);
    caption.htmlFor = input.id;
    wrapper.append(caption, input);
    if (help) {
      const hint = el("p", "field-help", help);
      hint.id = `${input.id}-help`;
      input.setAttribute("aria-describedby", hint.id);
      wrapper.append(hint);
    }
    return { field: wrapper, input };
  }

  function textField(label, placeholder, code = false) {
    const input = el("textarea", code ? "code" : "");
    input.placeholder = placeholder || "";
    input.maxLength = TEXT_LIMIT;
    input.rows = 8;
    input.spellcheck = !code;
    return field(label, input);
  }

  function selectField(label, options, selected) {
    const input = el("select");
    for (const [value, title] of options) {
      const option = new Option(title, value, value === selected, value === selected);
      input.add(option);
    }
    return field(label, input);
  }

  function numberField(label, value = "", attributes = {}) {
    const input = el("input");
    input.type = "number";
    input.step = "any";
    input.value = value;
    input.defaultValue = value;
    Object.assign(input, attributes);
    return field(label, input);
  }

  function checkField(label, checked = false) {
    const input = el("input");
    input.type = "checkbox";
    input.checked = checked;
    input.defaultChecked = checked;
    const caption = el("label", "check-field");
    caption.append(input, document.createTextNode(label));
    return { field: caption, input };
  }

  function row(...items) {
    const wrapper = el("div", "field-row");
    wrapper.append(...items.map((item) => item.field || item));
    return wrapper;
  }

  function checks(...items) {
    const wrapper = el("div", "checks");
    wrapper.append(...items.map((item) => item.field));
    return wrapper;
  }

  function bytes(size) {
    if (size < 1024) return `${size} B`;
    if (size < MiB) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / MiB).toFixed(2)} MB`;
  }

  function readableNumber(value) {
    if (value === 0) return "0";
    if (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-6) return value.toPrecision(10).replace(/\.?0+e/, "e");
    return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value);
  }

  function requireText(value, label = "text") {
    if (!value.length) throw new Error(`Enter ${label} first.`);
    if (value.length > TEXT_LIMIT) throw new Error("Use up to 250,000 characters at a time.");
    return value;
  }

  function finiteNumber(input, label) {
    if (!input.value.trim()) throw new Error(`Enter ${label}.`);
    const value = Number(input.value);
    if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
    return value;
  }

  function cleanFilename(name) {
    let safe = String(name).replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
      .replace(/^\.+/, "").replace(/[. ]+$/, "") || "klyvate-result";
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = `klyvate-${safe}`;
    if (safe.length <= 100) return safe;
    const dot = safe.lastIndexOf(".");
    const extension = dot > 0 && safe.length - dot <= 12 ? safe.slice(dot) : "";
    return safe.slice(0, 100 - extension.length) + extension;
  }

  function basename(name) {
    return cleanFilename(name.replace(/\.[^.]+$/, ""));
  }

  function workspace(container, context, runLabel, help) {
    const form = el("form", "tool-form");
    form.noValidate = true;
    const inputs = el("div", "tool-inputs");
    const actions = el("div", "tool-actions");
    const run = action(runLabel, "button primary");
    run.type = "submit";
    const reset = action("Reset", "button quiet");
    reset.type = "reset";
    actions.append(run, reset);
    const status = el("p", "feedback");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const result = el("section", "result-area");
    result.hidden = true;
    result.setAttribute("aria-label", "Result");
    form.append(inputs, actions, status, result);
    container.append(form, el("p", "tool-help", help));

    let generation = 0;
    let resultCleanups = [];
    const resetHandlers = [];
    const cleanups = [];
    let active = true;

    function clearResult() {
      for (const cleanup of resultCleanups) cleanup();
      resultCleanups = [];
      result.replaceChildren();
      result.hidden = true;
    }

    function message(text, error = false) {
      status.classList.toggle("error", error);
      status.setAttribute("role", error ? "alert" : "status");
      status.textContent = text;
    }

    function invalidate() {
      generation++;
      clearResult();
      message("");
      run.disabled = false;
      run.textContent = runLabel;
      form.removeAttribute("aria-busy");
    }

    function show() {
      result.hidden = false;
      const heading = el("div", "result-header");
      heading.append(el("h2", "", "Result"));
      result.append(heading);
    }

    form.addEventListener("input", (event) => {
      if (inputs.contains(event.target)) invalidate();
    });
    form.addEventListener("change", (event) => {
      if (inputs.contains(event.target)) invalidate();
    });
    form.addEventListener("reset", () => {
      invalidate();
      queueMicrotask(() => {
        if (active) for (const handler of resetHandlers) handler();
      });
    });
    context.signal.addEventListener("abort", () => {
      active = false;
      invalidate();
      for (const cleanup of cleanups) cleanup();
      for (const input of form.querySelectorAll("textarea")) input.value = "";
    }, { once: true });

    return {
      form, inputs, actions, run, reset, status, result, context,
      message, invalidate, show,
      isActive: () => active && !context.signal.aborted,
      cleanup: (handler) => cleanups.push(handler),
      resultCleanup: (handler) => resultCleanups.push(handler),
      onReset: (handler) => resetHandlers.push(handler),
      submit(process, render) {
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          invalidate();
          const ticket = generation;
          const current = () => active && ticket === generation && !context.signal.aborted;
          run.disabled = true;
          run.textContent = "Working…";
          form.setAttribute("aria-busy", "true");
          message("Working in your browser…");
          try {
            const data = await process();
            if (!current()) return;
            show();
            render(data);
            message("Done. Your result is ready.");
          } catch (error) {
            if (current()) {
              clearResult();
              message(error instanceof Error ? error.message : "This operation could not be completed.", true);
            }
          } finally {
            if (current()) {
              run.disabled = false;
              run.textContent = runLabel;
              form.removeAttribute("aria-busy");
            }
          }
        });
      },
    };
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch { /* Try the browser's local clipboard fallback. */ }
    }
    const previousFocus = document.activeElement;
    const input = el("textarea", "visually-hidden");
    input.value = text;
    input.readOnly = true;
    input.setAttribute("aria-label", "Text to copy");
    document.body.append(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { /* Use visible feedback below. */ }
    input.remove();
    previousFocus?.focus();
    if (!copied) throw new Error("Clipboard access is unavailable. Select the result and copy it with your keyboard.");
  }

  function copyButton(w, text, label = "Copy result") {
    const button = action(label);
    button.prepend(w.context.icon("copy"));
    button.addEventListener("click", async () => {
      try {
        await copyText(text);
        if (w.isActive() && button.isConnected) w.message("Copied to clipboard.");
      } catch (error) {
        if (w.isActive() && button.isConnected) w.message(error.message, true);
      }
    });
    return button;
  }

  function downloadButton(w, blob, filename, label) {
    const url = URL.createObjectURL(blob);
    w.resultCleanup(() => URL.revokeObjectURL(url));
    const link = el("a", "button secondary", label || "Download result");
    link.href = url;
    link.download = cleanFilename(filename);
    link.prepend(w.context.icon("download"));
    return link;
  }

  function textResult(w, text, options = {}) {
    const output = textField(options.label || "Result text", "", options.code ?? true);
    output.input.readOnly = true;
    output.input.value = text;
    output.input.classList.add("output-text");
    w.result.append(output.field);
    const buttons = el("div", "result-buttons");
    buttons.append(copyButton(w, text, options.copyLabel));
    if (options.filename) {
      const blob = new Blob([text], { type: options.mime || "text/plain;charset=utf-8" });
      buttons.append(downloadButton(w, blob, options.filename, options.downloadLabel));
    }
    w.result.append(buttons);
  }

  function stats(w, entries) {
    const grid = el("div", "stats-grid");
    for (const [label, value] of entries) {
      const stat = el("div", "stat");
      stat.append(el("span", "stat-value", String(value)), el("span", "stat-label", label));
      grid.append(stat);
    }
    w.result.append(grid);
  }

  function note(w, text) {
    w.result.append(el("p", "result-note", text));
  }

  function splitLines(text) {
    return text.replace(/\r\n?/g, "\n").split("\n");
  }

  function textToBase64(text) {
    const data = new TextEncoder().encode(text);
    let binary = "";
    for (let offset = 0; offset < data.length; offset += 8192) {
      binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
    }
    return btoa(binary);
  }

  function base64ToText(text) {
    const clean = text.replace(/\s/g, "");
    if (!clean || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) {
      throw new Error("Enter valid standard Base64 using letters, digits, +, /, and optional padding.");
    }
    if (clean.includes("=") && clean.length % 4 !== 0) throw new Error("Base64 padding is incomplete.");
    let binary;
    try { binary = atob(clean); } catch { throw new Error("This Base64 input has an invalid length or padding."); }
    if (btoa(binary).replace(/=+$/, "") !== clean.replace(/=+$/, "")) {
      throw new Error("This Base64 input contains invalid trailing bits.");
    }
    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    } catch {
      throw new Error("The decoded bytes are not valid UTF-8 text. Use this tool for text encoded as UTF-8.");
    }
  }

  function parseCSV(raw) {
    const text = raw.replace(/^\uFEFF/, "");
    if (!text.length) throw new Error("Enter CSV with a header row.");
    const rows = [];
    let record = [];
    let cell = "";
    let quoted = false;
    let closedQuote = false;
    let cellStart = true;
    let endedWithNewline = false;

    function finishCell() {
      record.push(cell);
      cell = "";
      cellStart = true;
      closedQuote = false;
    }

    function finishRow() {
      finishCell();
      rows.push(record);
      record = [];
    }

    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      endedWithNewline = false;
      if (quoted) {
        if (char === '"') {
          if (text[index + 1] === '"') { cell += '"'; index++; }
          else { quoted = false; closedQuote = true; }
        } else cell += char;
        continue;
      }
      if (char === ",") { finishCell(); continue; }
      if (char === "\n" || char === "\r") {
        if (char === "\r" && text[index + 1] === "\n") index++;
        finishRow();
        endedWithNewline = true;
        continue;
      }
      if (closedQuote) throw new Error("Unexpected text after a closing CSV quote. Separate cells with commas.");
      if (char === '"') {
        if (!cellStart) throw new Error("Quote an entire CSV cell and escape inner quotes by doubling them.");
        quoted = true;
        cellStart = false;
        continue;
      }
      cellStart = false;
      cell += char;
    }
    if (quoted) throw new Error("A quoted CSV cell is missing its closing double quote.");
    if (!endedWithNewline) finishRow();
    const headers = rows.shift();
    if (headers.some((header) => !header.trim())) throw new Error("Every CSV column needs a non-empty header.");
    if (new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique.");
    if (headers.length > 1000) throw new Error("Use up to 1,000 CSV columns.");
    const objects = rows.map((values, index) => {
      if (values.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${values.length} cells. Expected ${headers.length}.`);
      return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
    });
    return { objects, columns: headers.length };
  }

  function csvCell(value) {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function jsonToCSV(text) {
    const data = parseJSON(text);
    if (!Array.isArray(data) || !data.length) throw new Error("Enter a non-empty JSON array of flat objects.");
    const columns = [];
    const seen = new Set();
    for (const item of data) {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        throw new Error("Each array item must be a flat object.");
      }
      for (const [key, value] of Object.entries(item)) {
        if (!key.trim()) throw new Error("JSON object keys must be non-empty CSV headers.");
        if (value !== null && typeof value === "object") throw new Error("Nested objects and arrays cannot be converted to CSV. Use only strings, numbers, booleans, or null.");
        if (typeof value === "number" && !Number.isFinite(value)) throw new Error("CSV values must contain finite numbers.");
        if (!seen.has(key)) { seen.add(key); columns.push(key); }
      }
    }
    if (!columns.length) throw new Error("Add at least one property to the JSON objects.");
    if (columns.length > 1000) throw new Error("Use up to 1,000 columns.");
    const rows = [columns.map(csvCell).join(",")];
    for (const item of data) {
      rows.push(columns.map((key) => csvCell(Object.hasOwn(item, key) ? item[key] : "")).join(","));
    }
    return { text: rows.join("\r\n"), rows: data.length, columns: columns.length };
  }

  function parseJSON(text) {
    try {
      return JSON.parse(text.replace(/^\uFEFF/, ""), (key, value) => {
        if (typeof value === "number" && !Number.isFinite(value)) {
          throw new RangeError("A JSON number exceeds the browser’s finite numeric range.");
        }
        return value;
      });
    } catch (error) {
      if (error instanceof RangeError) throw error;
      throw new Error(`Invalid JSON. ${error.message}`);
    }
  }

  function lineDiff(before, after) {
    if (before.length > 50000 || after.length > 50000) throw new Error("Compare up to 50,000 characters in each text.");
    const left = before === "" ? [] : splitLines(before);
    const right = after === "" ? [] : splitLines(after);
    if (left.length > 500 || right.length > 500) throw new Error("Compare up to 500 lines in each text.");
    const width = right.length + 1;
    const table = new Uint16Array((left.length + 1) * width);
    for (let i = left.length - 1; i >= 0; i--) {
      for (let j = right.length - 1; j >= 0; j--) {
        const at = i * width + j;
        table[at] = left[i] === right[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
      }
    }
    const lines = [];
    let i = 0;
    let j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        lines.push({ kind: "unchanged", value: left[i++] });
        j++;
      } else if (j < right.length && (i === left.length || table[i * width + j + 1] > table[(i + 1) * width + j])) {
        lines.push({ kind: "added", value: right[j++] });
      } else lines.push({ kind: "removed", value: left[i++] });
    }
    return lines;
  }

  function mountCounter(container, context) {
    const w = workspace(container, context, "Count text", "Words are whitespace-separated groups. Characters count Unicode code points, so combining marks and emoji sequences can contain multiple characters. “Without spaces” excludes all Unicode whitespace. Lines include blank and trailing lines, with an empty input counted as zero. Reading time assumes 200 words per minute.");
    const source = textField("Your text", "Paste or type your text…");
    w.inputs.append(source.field);
    w.run.hidden = true;

    function update() {
      const value = source.input.value;
      const words = value.trim() ? value.trim().split(/\s+/u).length : 0;
      w.show();
      stats(w, [
        ["Words", words],
        ["Characters", Array.from(value).length],
        ["Without spaces", Array.from(value.replace(/\s/gu, "")).length],
        ["Lines", value ? splitLines(value).length : 0],
        ["Reading time", words ? `~${Math.ceil(words / 200)} min` : "0 min"],
      ]);
      const text = `${words} words\n${Array.from(value).length} characters\n${Array.from(value.replace(/\s/gu, "")).length} characters without spaces\n${value ? splitLines(value).length : 0} lines\nEstimated reading time: ${words ? Math.ceil(words / 200) : 0} minutes`;
      const buttons = el("div", "result-buttons");
      buttons.append(copyButton(w, text, "Copy counts"));
      w.result.append(buttons);
    }

    w.form.addEventListener("input", (event) => { if (event.target === source.input) update(); });
    w.onReset(update);
    update();
  }

  function mountCase(container, context) {
    const w = workspace(container, context, "Convert case", "Title case capitalizes each Unicode word. Sentence case capitalizes the first letter and letters after . ! or ?, using whitespace as the sentence boundary. Results appear separately so your original input stays available.");
    const source = textField("Your text", "Paste or type text to convert…");
    const mode = selectField("Case", [
      ["upper", "UPPERCASE"], ["lower", "lowercase"], ["title", "Title Case"], ["sentence", "Sentence case"],
    ], "upper");
    w.inputs.append(source.field, mode.field);
    w.submit(() => {
      const text = requireText(source.input.value);
      if (mode.input.value === "upper") return text.toLocaleUpperCase();
      const lower = text.toLocaleLowerCase();
      if (mode.input.value === "lower") return lower;
      if (mode.input.value === "title") {
        return lower.replace(/\p{L}[\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{M}]+)*/gu, (word) =>
          word.replace(/^\p{L}/u, (char) => char.toLocaleUpperCase()));
      }
      return lower.replace(/(^[^\p{L}]*\p{L}|[.!?]\s+[^\p{L}]*\p{L})/gu, (start) =>
        start.replace(/\p{L}/u, (char) => char.toLocaleUpperCase()));
    }, (text) => textResult(w, text, { code: false, filename: "klyvate-case.txt" }));
  }

  function mountDedupe(container, context) {
    const w = workspace(container, context, "Remove duplicates", "Lines are compared using your options. The first matching line is kept with its original text and spacing. The original order is preserved. Blank lines participate in comparison, and line endings are normalized to LF.");
    const source = textField("Lines", "One item per line…");
    const trim = checkField("Trim for comparison", true);
    const ignoreCase = checkField("Ignore case");
    w.inputs.append(source.field, checks(trim, ignoreCase));
    w.submit(() => {
      const lines = splitLines(requireText(source.input.value));
      const seen = new Set();
      const result = [];
      for (const line of lines) {
        let key = trim.input.checked ? line.trim() : line;
        if (ignoreCase.input.checked) key = key.toLocaleLowerCase();
        if (!seen.has(key)) { seen.add(key); result.push(line); }
      }
      return { text: result.join("\n"), removed: lines.length - result.length };
    }, ({ text, removed }) => {
      textResult(w, text, { filename: "klyvate-unique-lines.txt", code: false });
      note(w, `${removed} duplicate ${removed === 1 ? "line" : "lines"} removed.`);
    });
  }

  function mountSorter(container, context) {
    const w = workspace(container, context, "Sort lines", "Each line is one item, including blank lines. Numeric mode uses natural sorting, so item 2 comes before item 10. Duplicate lines are kept and equal items keep their original order. Sorting uses your browser’s locale and outputs LF line endings.");
    const source = textField("Lines", "One item per line…");
    const order = selectField("Order", [["asc", "Ascending"], ["desc", "Descending"]], "asc");
    const numeric = checkField("Numeric (natural sort)");
    const ignoreCase = checkField("Ignore case");
    w.inputs.append(source.field, order.field, checks(numeric, ignoreCase));
    w.submit(() => {
      const lines = splitLines(requireText(source.input.value));
      const collator = new Intl.Collator(undefined, {
        numeric: numeric.input.checked,
        sensitivity: ignoreCase.input.checked ? "accent" : "variant",
      });
      const direction = order.input.value === "desc" ? -1 : 1;
      return lines.sort((a, b) => direction * collator.compare(a, b)).join("\n");
    }, (text) => textResult(w, text, { filename: "klyvate-sorted-lines.txt", code: false }));
  }

  function mountFind(container, context) {
    const w = workspace(container, context, "Replace text", "Search is plain text. Replacement characters such as $ and backslashes are inserted literally. Case-insensitive matching uses the browser’s Unicode-aware case matching. Matches do not overlap. Empty replacement text removes matches.");
    const source = textField("Your text", "Paste the text you want to edit…");
    const findInput = el("input");
    findInput.type = "text";
    findInput.maxLength = TEXT_LIMIT;
    const find = field("Find", findInput);
    const replacementInput = el("input");
    replacementInput.type = "text";
    replacementInput.maxLength = TEXT_LIMIT;
    const replacement = field("Replace with", replacementInput);
    const sensitive = checkField("Case sensitive", true);
    const all = checkField("Replace all", true);
    w.inputs.append(source.field, row(find, replacement), checks(sensitive, all));
    w.submit(() => {
      const value = requireText(source.input.value);
      if (!find.input.value.length) throw new Error("Enter the text to find.");
      const escaped = find.input.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const flags = `${all.input.checked ? "g" : ""}${sensitive.input.checked ? "" : "i"}u`;
      const pattern = new RegExp(escaped, flags);
      let count = 0;
      let totalLength = value.length;
      const output = value.replace(pattern, (match) => {
        totalLength += replacement.input.value.length - match.length;
        if (totalLength > 2000000) throw new Error("The replacement would exceed 2,000,000 characters. Use a shorter replacement or less input.");
        count++;
        return replacement.input.value;
      });
      return { output, count };
    }, ({ output, count }) => {
      textResult(w, output, { filename: "klyvate-replaced.txt", code: false });
      note(w, `${count} ${count === 1 ? "replacement" : "replacements"} made.`);
    });
  }

  function mountDiff(container, context) {
    const w = workspace(container, context, "Compare texts", "Compares complete lines with a bounded longest-common-subsequence algorithm. Limit 500 lines and 50,000 characters per side. CRLF and CR line endings are normalized to LF. Spaces, case, and trailing blank lines are significant.");
    const before = textField("Original text", "Paste the original text…", true);
    const after = textField("Changed text", "Paste the changed text…", true);
    before.input.maxLength = 50000;
    after.input.maxLength = 50000;
    const columns = el("div", "two-columns");
    columns.append(before.field, after.field);
    w.inputs.append(columns);
    w.submit(() => {
      if (!before.input.value && !after.input.value) throw new Error("Enter text on at least one side.");
      return lineDiff(before.input.value, after.input.value);
    }, (lines) => {
      const summary = el("div", "diff-summary");
      for (const kind of ["added", "removed", "unchanged"]) {
        summary.append(el("span", "", `${lines.filter((line) => line.kind === kind).length} ${kind}`));
      }
      const list = el("div", "diff-list");
      list.setAttribute("role", "list");
      const markers = { added: "+", removed: "−", unchanged: " " };
      for (const line of lines) {
        const item = el("div", `diff-line diff-${line.kind}`);
        item.setAttribute("role", "listitem");
        const marker = el("span", "diff-marker", markers[line.kind]);
        marker.setAttribute("aria-hidden", "true");
        item.append(marker, el("span", "visually-hidden", `${line.kind}: `), el("span", "", line.value || " "));
        list.append(item);
      }
      const text = lines.map((line) => `${markers[line.kind]} ${line.value}`).join("\n");
      const buttons = el("div", "result-buttons");
      buttons.append(copyButton(w, text, "Copy difference"), downloadButton(w, new Blob([text], { type: "text/plain;charset=utf-8" }), "klyvate-difference.txt"));
      w.result.append(summary, list, buttons);
    });
  }

  function mountJSON(container, context) {
    const w = workspace(container, context, "Format JSON", "JSON is parsed using the browser’s native JSON parser. Invalid syntax is reported with the browser’s error details. JSON numbers use JavaScript’s numeric precision, so quote identifiers that need more than 15–16 significant digits.");
    const source = textField("JSON", '{\n  "hello": "world"\n}', true);
    const format = selectField("Output", [["2", "Pretty print · 2 spaces"], ["4", "Pretty print · 4 spaces"], ["0", "Minify"]], "2");
    w.inputs.append(source.field, format.field);
    w.submit(() => JSON.stringify(parseJSON(requireText(source.input.value, "JSON")), null, Number(format.input.value)),
      (text) => textResult(w, text, { filename: "klyvate-formatted.json", mime: "application/json;charset=utf-8" }));
  }

  function mountBase64(container, context) {
    const w = workspace(container, context, "Convert text", "Text is encoded as UTF-8 before Base64 conversion. Decoding accepts standard Base64 with optional whitespace and omitted padding, and validates that the result is UTF-8. This tool is for text. Base64 is an encoding and can be decoded by anyone.");
    const source = textField("Input text", "Paste Unicode text or Base64…", true);
    const mode = selectField("Operation", [["encode", "Encode text → Base64"], ["decode", "Decode Base64 → text"]], "encode");
    w.inputs.append(source.field, mode.field);
    w.submit(() => {
      const text = requireText(source.input.value);
      return mode.input.value === "encode" ? textToBase64(text) : base64ToText(text);
    }, (text) => textResult(w, text, { filename: "klyvate-base64.txt" }));
  }

  function mountURL(container, context) {
    const w = workspace(container, context, "Convert URL component", "Uses encodeURIComponent and decodeURIComponent for a single URL component, such as a query value. The + character stays literal when decoding. Malformed percent escapes and invalid Unicode produce an error.");
    const source = textField("Input", "Paste a URL component or text…", true);
    const mode = selectField("Operation", [["encode", "Encode component"], ["decode", "Decode component"]], "encode");
    w.inputs.append(source.field, mode.field);
    w.submit(() => {
      const text = requireText(source.input.value);
      try { return mode.input.value === "encode" ? encodeURIComponent(text) : decodeURIComponent(text); }
      catch { throw new Error("The input contains an invalid percent escape or Unicode sequence. Check the input and try again."); }
    }, (text) => textResult(w, text, { filename: "klyvate-url-component.txt" }));
  }

  function mountCSV(container, context) {
    const w = workspace(container, context, "Convert data", "CSV uses commas and a required, unique header row. Quoted commas, doubled quotes, embedded line breaks, and an initial UTF-8 BOM are supported. CSV cells become JSON strings. JSON-to-CSV accepts flat objects, combines their keys in first-seen order, and writes null or missing values as empty cells. Review spreadsheet formula-like cells before opening CSV in a spreadsheet.");
    const source = textField("Input", 'name,note\nAda,"Hello, world"', true);
    const direction = selectField("Conversion", [["csv-json", "CSV → JSON"], ["json-csv", "JSON → CSV"]], "csv-json");
    w.inputs.append(source.field, direction.field);
    w.submit(() => {
      const text = requireText(source.input.value, "CSV or JSON");
      if (direction.input.value === "csv-json") {
        const data = parseCSV(text);
        return { text: JSON.stringify(data.objects, null, 2), rows: data.objects.length, columns: data.columns, json: true };
      }
      return { ...jsonToCSV(text), json: false };
    }, (data) => {
      textResult(w, data.text, {
        filename: data.json ? "klyvate-data.json" : "klyvate-data.csv",
        mime: data.json ? "application/json;charset=utf-8" : "text/csv;charset=utf-8",
      });
      note(w, `${data.rows} data ${data.rows === 1 ? "row" : "rows"} · ${data.columns} ${data.columns === 1 ? "column" : "columns"}`);
    });
  }

  function mountPercentage(container, context) {
    const w = workspace(container, context, "Calculate", "Percent change is (B − A) ÷ A × 100. Inputs must be finite numbers. Calculations that divide by zero or overflow are reported. Results are displayed with up to 12 significant digits.");
    const mode = selectField("Calculation", [["of", "X% of Y"], ["proportion", "X as a percentage of Y"], ["change", "Percentage change from A to B"]], "of");
    const first = numberField("X", "", { placeholder: "e.g. 20" });
    const second = numberField("Y", "", { placeholder: "e.g. 150" });
    w.inputs.append(mode.field, row(first, second));

    function updateLabels() {
      first.field.querySelector("label").textContent = mode.input.value === "change" ? "A · original value" : "X";
      second.field.querySelector("label").textContent = mode.input.value === "change" ? "B · new value" : "Y";
    }
    mode.input.addEventListener("change", updateLabels);
    w.onReset(updateLabels);
    w.submit(() => {
      const changing = mode.input.value === "change";
      const a = finiteNumber(first.input, changing ? "A" : "X");
      const b = finiteNumber(second.input, changing ? "B" : "Y");
      let result;
      let expression;
      if (mode.input.value === "of") {
        result = (a / 100) * b;
        expression = `${readableNumber(a)}% of ${readableNumber(b)}`;
      } else if (mode.input.value === "proportion") {
        if (b === 0) throw new Error("Y must be non-zero to calculate a proportion.");
        result = (a / b) * 100;
        expression = `${readableNumber(a)} as a percentage of ${readableNumber(b)}`;
      } else {
        if (a === 0) throw new Error("A must be non-zero to calculate percentage change.");
        result = ((b - a) / a) * 100;
        expression = `Change from ${readableNumber(a)} to ${readableNumber(b)}`;
      }
      if (!Number.isFinite(result)) throw new Error("The result exceeds the browser’s numeric range. Use smaller values.");
      const formatted = `${readableNumber(result)}${mode.input.value === "of" ? "" : "%"}`;
      return { formatted, expression };
    }, ({ formatted, expression }) => {
      w.result.append(el("p", "result-metric", formatted), el("p", "result-unit", expression));
      const buttons = el("div", "result-buttons");
      buttons.append(copyButton(w, formatted));
      w.result.append(buttons);
    });
  }

  function utcDay(text) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) throw new Error("Choose both dates, with years between 0001 and 9999.");
    const [, year, month, day] = match.map(Number);
    if (year < 1 || year > 9999) throw new Error("Use years between 0001 and 9999.");
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error("Choose valid calendar dates.");
    }
    return date.getTime() / 86400000;
  }

  function mountDate(container, context) {
    const w = workspace(container, context, "Calculate days", "Calculates date B minus date A using UTC calendar dates, so daylight-saving and local time zones do not change the answer. Counts elapsed days between dates, excluding the starting day. Same-day dates have a difference of zero.");
    const a = el("input");
    const b = el("input");
    for (const input of [a, b]) {
      input.type = "date";
      input.min = "0001-01-01";
      input.max = "9999-12-31";
    }
    w.inputs.append(row(field("Date A", a), field("Date B", b)));
    w.submit(() => {
      const signed = utcDay(b.value) - utcDay(a.value);
      return { signed, absolute: Math.abs(signed), a: a.value, b: b.value };
    }, ({ signed, absolute, a, b }) => {
      stats(w, [
        ["Absolute difference · days", absolute],
        ["Signed difference · B − A", signed > 0 ? `+${signed}` : signed],
      ]);
      note(w, signed === 0 ? "Both dates are the same." : signed > 0 ? `Date A (${a}) is earlier than date B (${b}).` : `Date B (${b}) is earlier than date A (${a}).`);
      const buttons = el("div", "result-buttons");
      buttons.append(copyButton(w, `Absolute difference: ${absolute} days\nSigned difference (B − A): ${signed} days`));
      w.result.append(buttons);
    });
  }

  function filePicker(w, options) {
    const zone = el("div", "dropzone");
    const input = el("input", "file-control");
    input.type = "file";
    input.id = `file-${++nextId}`;
    if (options.accept) input.accept = options.accept;
    const caption = el("label", "file-label", options.title);
    caption.htmlFor = input.id;
    const hint = el("p", "", options.help);
    hint.id = `${input.id}-help`;
    input.setAttribute("aria-describedby", hint.id);
    const summary = el("p", "file-summary");
    zone.append(w.context.icon("upload"), caption, hint, input, summary);
    w.inputs.append(zone);

    let file = null;
    let selection = 0;

    function clear() {
      selection++;
      file = null;
      summary.textContent = "";
      zone.classList.remove("is-dragging");
      options.clear?.();
    }

    async function choose(files) {
      clear();
      w.invalidate();
      const ticket = selection;
      const current = () => ticket === selection && w.isActive();
      if (!files.length) return;
      try {
        if (files.length !== 1) throw new Error("Choose one file at a time.");
        const selected = files[0];
        if (!selected.size && !options.allowEmpty) throw new Error("This file is empty. Choose a file with content.");
        if (selected.size > options.maxSize) throw new Error(`Choose a file no larger than ${bytes(options.maxSize)}.`);
        w.run.disabled = true;
        w.message("Reading your file…");
        const prepared = options.prepare ? await options.prepare(selected) : selected;
        if (!current()) {
          prepared?.dispose?.();
          return;
        }
        options.commit?.(prepared, selected);
        file = selected;
        summary.textContent = `${selected.name} · ${bytes(selected.size)}`;
        w.message("File ready. Choose your options and run the tool.");
      } catch (error) {
        if (current()) w.message(error.message || "This file could not be read.", true);
      } finally {
        if (current()) w.run.disabled = false;
      }
    }

    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      queueMicrotask(() => { if (w.isActive()) choose(files); });
    });
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("is-dragging");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    });
    zone.addEventListener("dragleave", (event) => {
      if (!zone.contains(event.relatedTarget)) zone.classList.remove("is-dragging");
    });
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragging");
      input.value = "";
      choose(Array.from(event.dataTransfer?.files || []));
    });
    w.onReset(clear);
    w.cleanup(clear);
    return {
      zone,
      get file() { return file; },
    };
  }

  function validateDimensions(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new Error("Width and height must be positive whole numbers.");
    }
    if (width > DIMENSION_LIMIT || height > DIMENSION_LIMIT || width * height > PIXEL_LIMIT) {
      throw new Error("Use images up to 10,000 pixels on either side and 20 million pixels in total.");
    }
  }

  async function inspectImage(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(data.buffer);
    const ascii = (at, length) => String.fromCharCode(...data.subarray(at, at + length));
    let width;
    let height;
    let type;
    let animated = false;
    if (data.length >= 33 && data[0] === 137 && ascii(1, 3) === "PNG" &&
        data[4] === 13 && data[5] === 10 && data[6] === 26 && data[7] === 10 && ascii(12, 4) === "IHDR") {
      type = "image/png";
      width = view.getUint32(16);
      height = view.getUint32(20);
      let at = 8;
      while (at + 12 <= data.length) {
        const length = view.getUint32(at);
        if (ascii(at + 4, 4) === "acTL") animated = true;
        if (length > data.length - at - 12) throw new Error("The PNG file contains an invalid chunk.");
        at += length + 12;
      }
    } else if (data.length > 12 && data[0] === 255 && data[1] === 216 && data[2] === 255) {
      type = "image/jpeg";
      const frameMarkers = new Set([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]);
      let at = 2;
      while (at < data.length) {
        if (data[at++] !== 255) throw new Error("The JPEG header is invalid.");
        while (data[at] === 255) at++;
        const marker = data[at++];
        if (marker === 218 || marker === 217) break;
        if (marker === 216 || (marker >= 208 && marker <= 215)) continue;
        if (at + 2 > data.length) break;
        const length = view.getUint16(at);
        if (length < 2 || at + length > data.length) throw new Error("The JPEG header is incomplete.");
        if (frameMarkers.has(marker)) {
          if (length < 8) throw new Error("The JPEG frame is invalid.");
          height = view.getUint16(at + 3);
          width = view.getUint16(at + 5);
          break;
        }
        at += length;
      }
    } else if (data.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
      type = "image/webp";
      let at = 12;
      while (at + 8 <= data.length) {
        const kind = ascii(at, 4);
        const length = view.getUint32(at + 4, true);
        const start = at + 8;
        if (length > data.length - start) throw new Error("The WebP file contains an invalid chunk.");
        if (kind === "VP8X" && length >= 10) {
          animated = Boolean(data[start] & 2);
          width = 1 + data[start + 4] + (data[start + 5] << 8) + (data[start + 6] << 16);
          height = 1 + data[start + 7] + (data[start + 8] << 8) + (data[start + 9] << 16);
        } else if (!width && kind === "VP8 " && length >= 10 &&
                   data[start + 3] === 157 && data[start + 4] === 1 && data[start + 5] === 42) {
          width = view.getUint16(start + 6, true) & 16383;
          height = view.getUint16(start + 8, true) & 16383;
        } else if (!width && kind === "VP8L" && length >= 5 && data[start] === 47) {
          width = 1 + data[start + 1] + ((data[start + 2] & 63) << 8);
          height = 1 + (data[start + 2] >> 6) + (data[start + 3] << 2) + ((data[start + 4] & 15) << 10);
        }
        at = start + length + (length % 2);
      }
    } else {
      throw new Error("Choose a PNG, JPEG, or WebP image. This file’s content does not match a supported format.");
    }
    if (animated) throw new Error("Choose a still PNG or WebP image. Animated images are not supported.");
    if (!width || !height) throw new Error("The image dimensions could not be read. The file may be damaged.");
    validateDimensions(width, height);
    return { type, width, height };
  }

  async function decodeImage(file) {
    const info = await inspectImage(file);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.alt = "Original image preview";
    image.className = "input-preview";
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("The browser could not decode this image. Choose another PNG, JPEG, or WebP file."));
        image.src = url;
      });
      validateDimensions(image.naturalWidth, image.naturalHeight);
      return {
        ...info, image, width: image.naturalWidth, height: image.naturalHeight,
        dispose() {
          image.removeAttribute("src");
          image.remove();
          image.onload = null;
          image.onerror = null;
        },
      };
    } catch (error) {
      image.removeAttribute("src");
      throw error;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function exportCanvas(source, width, height, type, quality, background, matrix) {
    validateDimensions(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const painter = canvas.getContext("2d");
    if (!painter) {
      canvas.width = canvas.height = 0;
      throw new Error("Canvas is unavailable in this browser.");
    }
    painter.imageSmoothingEnabled = true;
    painter.imageSmoothingQuality = "high";
    if (type === "image/jpeg") {
      painter.fillStyle = background;
      painter.fillRect(0, 0, width, height);
    }
    if (matrix) {
      painter.translate(width / 2, height / 2);
      painter.transform(...matrix, 0, 0);
      painter.drawImage(source.image, -source.width / 2, -source.height / 2);
    } else painter.drawImage(source.image, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          canvas.width = canvas.height = 0;
          if (!blob) reject(new Error("The browser could not create the output image. Try a smaller size."));
          else if (blob.type !== type) reject(new Error(`This browser cannot export ${type.split("/")[1].toUpperCase()}. Choose another output format.`));
          else resolve(blob);
        }, type, quality);
      } catch {
        canvas.width = canvas.height = 0;
        reject(new Error("Image export failed. Try another format or a smaller image."));
      }
    });
  }

  function imageResult(w, data) {
    const url = URL.createObjectURL(data.blob);
    const preview = new Image();
    preview.alt = "Processed image preview";
    preview.src = url;
    w.resultCleanup(() => {
      URL.revokeObjectURL(url);
      preview.removeAttribute("src");
    });
    const frame = el("div", "preview-frame");
    frame.append(preview);
    w.result.append(frame);
    stats(w, [
      ["Dimensions", `${data.width} × ${data.height}`],
      ["Input size", bytes(data.inputSize)],
      ["Output size", bytes(data.blob.size)],
    ]);
    const buttons = el("div", "result-buttons");
    buttons.append(downloadButton(w, data.blob, data.filename, `Download ${data.blob.type.split("/")[1].toUpperCase()}`));
    w.result.append(buttons);
    const change = (data.blob.size - data.inputSize) / data.inputSize * 100;
    note(w, change === 0 ? "The output has the same byte size as the input."
      : `The output is ${Math.abs(change).toFixed(1)}% ${change > 0 ? "larger" : "smaller"} than the input.`);
  }

  function mountImage(container, context, kind) {
    const labels = {
      resize: "Resize image", compress: "Compress image", convert: "Convert image",
      transform: "Generate image", base64: "Encode image",
    };
    const w = workspace(container, context, labels[kind], kind === "base64"
      ? "Encodes the original image bytes. Base64 uses about 33% more characters than the source byte count. Output is limited to 2 MB of text. Only still PNG, JPEG, and WebP images are supported."
      : "Supports still PNG, JPEG, and WebP images up to 20 MB, 10,000 pixels per side, and 20 million pixels. Canvas exports image pixels with browser-managed orientation and color, and can discard original metadata. PNG and WebP preserve transparency. JPEG fills transparent areas with the background color you choose.");
    let source = null;
    let sourceFile = null;
    let matrix = [1, 0, 0, 1];
    let transformCount = 0;
    const previewContainer = el("div");
    const dimensionSummary = el("p", "file-summary");
    let sizeFields;
    const picker = filePicker(w, {
      accept: "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp",
      title: "Choose an image or drop it here",
      help: kind === "base64" ? "PNG, JPEG, WebP · up to 1.49 MB" : "PNG, JPEG, WebP · up to 20 MB",
      maxSize: kind === "base64" ? Math.floor(1.49 * MiB) : IMAGE_LIMIT,
      prepare: decodeImage,
      clear() {
        source?.dispose();
        source = null;
        sourceFile = null;
        dimensionSummary.textContent = "";
        previewContainer.replaceChildren();
        if (sizeFields) {
          sizeFields.width.input.value = "";
          sizeFields.height.input.value = "";
        }
      },
      commit(data, file) {
        source = data;
        sourceFile = file;
        dimensionSummary.textContent = `${data.width} × ${data.height} pixels · ${data.type.split("/")[1].toUpperCase()}`;
        previewContainer.append(data.image);
        if (sizeFields) {
          sizeFields.width.input.value = data.width;
          sizeFields.height.input.value = data.height;
        }
      },
    });
    picker.zone.append(dimensionSummary, previewContainer);

    if (kind === "base64") {
      w.submit(async () => {
        if (!source || !picker.file) throw new Error("Choose a valid image first.");
        const file = sourceFile;
        const type = source.type;
        if (Math.ceil(file.size / 3) * 4 + type.length + 14 > BASE64_LIMIT) {
          throw new Error("The Base64 output would exceed 2 MB. Choose a smaller image.");
        }
        const data = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let at = 0; at < data.length; at += 8192) {
          binary += String.fromCharCode(...data.subarray(at, at + 8192));
        }
        const base64 = btoa(binary);
        return { base64, dataURL: `data:${type};base64,${base64}` };
      }, ({ base64, dataURL }) => {
        textResult(w, dataURL, { label: "Data URL", copyLabel: "Copy data URL" });
        textResult(w, base64, { label: "Plain Base64", copyLabel: "Copy Base64" });
        note(w, `${base64.length.toLocaleString()} Base64 characters. The data URL includes a format prefix for embedding.`);
      });
      return;
    }

    if (kind === "resize") {
      const width = numberField("Width · pixels", "", { min: 1, max: DIMENSION_LIMIT, step: 1 });
      const height = numberField("Height · pixels", "", { min: 1, max: DIMENSION_LIMIT, step: 1 });
      const ratio = checkField("Preserve aspect ratio", true);
      sizeFields = { width, height, ratio };
      w.inputs.append(row(width, height), ratio.field);
      width.input.addEventListener("input", () => {
        const value = Number(width.input.value);
        if (source && ratio.input.checked && value > 0) {
          height.input.value = Math.max(1, Math.round(value * source.height / source.width));
        }
      });
      height.input.addEventListener("input", () => {
        const value = Number(height.input.value);
        if (source && ratio.input.checked && value > 0) {
          width.input.value = Math.max(1, Math.round(value * source.width / source.height));
        }
      });
      ratio.input.addEventListener("change", () => {
        if (source && ratio.input.checked && Number(width.input.value) > 0) {
          height.input.value = Math.max(1, Math.round(Number(width.input.value) * source.height / source.width));
        }
      });
    }

    if (kind === "transform") {
      const controls = el("div", "rotate-controls");
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Image transformations");
      const summary = el("p", "transform-status", "Original orientation");
      const operations = [
        ["90° counterclockwise", () => { const [a, b, c, d] = matrix; matrix = [b, -a, d, -c]; }],
        ["90° clockwise", () => { const [a, b, c, d] = matrix; matrix = [-b, a, -d, c]; }],
        ["Flip horizontal", () => { const [a, b, c, d] = matrix; matrix = [-a, b, -c, d]; }],
        ["Flip vertical", () => { const [a, b, c, d] = matrix; matrix = [a, -b, c, -d]; }],
      ];
      for (const [label, apply] of operations) {
        const control = action(label);
        control.addEventListener("click", () => {
          w.invalidate();
          apply();
          transformCount++;
          summary.textContent = `${transformCount} ${transformCount === 1 ? "transformation" : "transformations"} applied. Generate the image to preview.`;
        });
        controls.append(control);
      }
      w.inputs.append(controls, summary);
      w.onReset(() => {
        matrix = [1, 0, 0, 1];
        transformCount = 0;
        summary.textContent = "Original orientation";
      });
    }

    const formats = kind === "compress"
      ? [["image/webp", "WebP"], ["image/jpeg", "JPEG"]]
      : [["image/png", "PNG"], ["image/jpeg", "JPEG"], ["image/webp", "WebP"]];
    const format = selectField("Output format", formats, formats[0][0]);
    const colorInput = el("input");
    colorInput.type = "color";
    colorInput.value = "#ffffff";
    colorInput.defaultValue = "#ffffff";
    const background = field("JPEG background", colorInput, "JPEG removes transparency and fills it with this color.");
    w.inputs.append(row(format, background));

    const qualityInput = el("input");
    qualityInput.type = "range";
    qualityInput.min = "1";
    qualityInput.max = "100";
    qualityInput.step = "1";
    qualityInput.value = "80";
    qualityInput.defaultValue = "80";
    const quality = field("Quality · 80%", qualityInput, "Higher quality usually produces a larger file.");
    w.inputs.append(quality.field);

    function updateFormat() {
      background.field.hidden = format.input.value !== "image/jpeg";
      quality.field.hidden = format.input.value === "image/png";
      quality.field.querySelector("label").textContent = `Quality · ${quality.input.value}%`;
    }
    format.input.addEventListener("change", updateFormat);
    quality.input.addEventListener("input", updateFormat);
    w.onReset(updateFormat);
    updateFormat();

    w.submit(async () => {
      if (!source || !picker.file) throw new Error("Choose a valid image first.");
      const original = source;
      const originalFile = sourceFile;
      let width = original.width;
      let height = original.height;
      const transform = kind === "transform" ? [...matrix] : null;
      if (sizeFields) {
        width = finiteNumber(sizeFields.width.input, "width");
        height = finiteNumber(sizeFields.height.input, "height");
      }
      if (transform && transform[0] === 0) [width, height] = [height, width];
      validateDimensions(width, height);
      const type = format.input.value;
      const blob = await exportCanvas(original, width, height, type, Number(quality.input.value) / 100, background.input.value, transform);
      const extension = type === "image/jpeg" ? "jpg" : type.split("/")[1];
      return {
        blob, width, height, inputSize: originalFile.size,
        filename: `${basename(originalFile.name)}-${kind}.${extension}`,
      };
    }, (data) => imageResult(w, data));
  }

  function mountHash(container, context) {
    const w = workspace(container, context, "Calculate SHA-256", "Computes a SHA-256 digest of the entire file using native Web Crypto. Files stay in this tab. Limit 100 MB because hashing reads the whole file into memory. Web Crypto may require HTTPS or a browser-supported secure file context.");
    if (!window.isSecureContext || !window.crypto?.subtle?.digest) {
      w.run.hidden = true;
      w.message("SHA-256 is unavailable in this browser context. Open the site over HTTPS or use a browser that supports Web Crypto for local files.", true);
      w.onReset(() => w.message("SHA-256 is unavailable in this browser context. Open the site over HTTPS or use a browser that supports Web Crypto for local files.", true));
      return;
    }
    const picker = filePicker(w, {
      title: "Choose a file or drop it here",
      help: "Any file type · up to 100 MB",
      maxSize: HASH_LIMIT,
      allowEmpty: true,
    });
    w.submit(async () => {
      const file = picker.file;
      if (!file) throw new Error("Choose a file first.");
      const data = await file.arrayBuffer();
      let digest;
      try { digest = await crypto.subtle.digest("SHA-256", data); }
      catch { throw new Error("The browser could not hash this file. Try a smaller file or another secure browser context."); }
      const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      return { hex, name: file.name };
    }, ({ hex, name }) => {
      w.result.append(el("p", "digest", hex));
      const buttons = el("div", "result-buttons");
      buttons.append(copyButton(w, hex, "Copy SHA-256"), downloadButton(w, new Blob([hex], { type: "text/plain;charset=utf-8" }), `${cleanFilename(name)}.sha256`, "Download hash"));
      w.result.append(buttons);
      note(w, `SHA-256 · ${name}`);
    });
  }

  const tools = {
    "image-resize": (container, context) => mountImage(container, context, "resize"),
    "image-compress": (container, context) => mountImage(container, context, "compress"),
    "image-convert": (container, context) => mountImage(container, context, "convert"),
    "image-rotate-flip": (container, context) => mountImage(container, context, "transform"),
    "image-to-base64": (container, context) => mountImage(container, context, "base64"),
    "word-character-counter": mountCounter,
    "case-converter": mountCase,
    "remove-duplicate-lines": mountDedupe,
    "text-sorter": mountSorter,
    "find-replace": mountFind,
    "text-difference-checker": mountDiff,
    "json-formatter-validator": mountJSON,
    "base64-text": mountBase64,
    "url-encoder-decoder": mountURL,
    "csv-json-converter": mountCSV,
    "sha-256-file-hash": mountHash,
    "percentage-calculator": mountPercentage,
    "date-difference-calculator": mountDate,
  };

  window.KlyvateTools = Object.freeze({
    mount(slug, container, context) {
      const tool = tools[slug];
      if (tool) tool(container, context);
      else container.append(el("p", "feedback error", "This tool could not be found. Return to the directory and try again."));
    },
  });
})();
