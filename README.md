# Klyvate

### Useful tools. No fuss.

Klyvate is a collection of **18 free browser utilities** for images, text, developer data, and everyday calculations. Files and text are processed locally in the current tab, and every tool is available without an account.

Built with **HTML, CSS, and plain JavaScript**, Klyvate runs by opening `index.html` and can be deployed as a static website.

## Features

- Searchable tool directory with category filters and favorites.
- Light and dark themes with saved preferences.
- Local file selection and drag-and-drop for file tools.
- Copy and download actions where relevant, reset controls, and inline feedback.
- Responsive layouts, labeled form controls, visible keyboard focus, and reduced-motion support.
- Offline use from downloaded project files, subject to browser API availability.

## Available tools

| Category | Tool | What it does |
| --- | --- | --- |
| Images | Image Resize | Set dimensions, preserve aspect ratio, and export PNG, JPEG, or WebP. |
| Images | Image Compress | Adjust JPEG/WebP quality and compare file sizes. |
| Images | Image Convert | Convert PNG, JPEG, and WebP with a selectable JPEG background. |
| Images | Image Rotate & Flip | Rotate 90° in either direction or flip horizontally/vertically. |
| Images | Image to Base64 | Generate a data URL and plain Base64 from the original image bytes. |
| Text | Word & Character Counter | Count words, Unicode characters, lines, and estimated reading time. |
| Text | Case Converter | Apply uppercase, lowercase, title case, or sentence case. |
| Text | Remove Duplicate Lines | Keep the first matching line with optional trim and case-insensitive comparison. |
| Text | Text Sorter | Sort lines in either direction with optional natural numeric sorting. |
| Text | Find & Replace | Replace literal text, choose first/all matches, and see replacement counts. |
| Text | Text Difference Checker | Highlight added, removed, and unchanged lines. |
| Developer & data | JSON Formatter & Validator | Validate JSON, format with 2/4 spaces, or minify. |
| Developer & data | Base64 Text Encoder/Decoder | Encode and decode UTF-8 text, including Unicode. |
| Developer & data | URL Encoder/Decoder | Encode and decode individual URL components. |
| Developer & data | CSV ↔ JSON Converter | Convert quoted CSV with headers and JSON arrays of flat objects. |
| Developer & data | SHA-256 File Hash | Calculate a local file checksum using Web Crypto. |
| Everyday | Percentage Calculator | Calculate percentages, proportions, and percentage change. |
| Everyday | Date Difference Calculator | Calculate absolute and signed calendar-day differences. |

## Getting started

1. Download or clone this repository.
2. Keep the project files together in one folder.
3. Open `index.html` in a modern desktop browser with JavaScript enabled.

The app uses relative assets and ordinary deferred scripts. Dependency installation, a build step, and a local server are unnecessary.

## Privacy

Tool inputs are processed in the current browser tab. Klyvate does not upload selected files or send pasted text to a server. It has no accounts, payments, backend, analytics, advertising, or third-party assets.

Only the selected theme and favorite tool IDs are stored in `localStorage`, when available. Tool content is cleared when you reset or leave its view. Hosted visits load the site's static assets. Browser extensions, clipboard contents, downloads, device settings, and hosting practices can affect privacy.

## Browser support and limits

Use a modern browser with Canvas, Blob downloads, TextEncoder, and TextDecoder support. File-size limits below use binary MiB, where 1 MiB is 1,048,576 bytes.

| Operation | Limit |
| --- | --- |
| Image processing | 20 MiB per file, 10,000 pixels per side, 20 million total pixels |
| Image to Base64 | 1.49 MiB input, 2 MiB generated text |
| Editable text | 250,000 characters |
| Text difference | 500 lines and 50,000 characters per side |
| Find-and-replace output | 2,000,000 characters |
| CSV conversion | 1,000 columns |
| File hashing | 100 MiB per file |
| Date calculations | Years 0001–9999 |

- Image tools accept still PNG, JPEG, and WebP. Export support depends on browser encoders. JPEG fills transparency with the chosen background, and Canvas exports can discard metadata. Compression can increase file size.
- SHA-256 requires Web Crypto in a supported secure context, usually HTTPS or a supported local-file context. The action is disabled with an explanation when unavailable.
- Clipboard permissions vary. A local copy fallback is attempted, followed by manual-copy guidance if needed.
- Word counts use whitespace-separated groups. Character counts use Unicode code points, and reading time assumes 200 words per minute.
- CSV requires unique, nonblank headers. Cells become JSON strings. JSON-to-CSV accepts flat objects and writes null or missing values as empty cells.
- JSON numbers use JavaScript precision. Quote long identifiers that require exact digits. URL decoding preserves literal plus signs.
- Date differences use UTC calendar dates, with the signed result calculated as date B minus date A.

## Verification and contributing

Initial development checks passed JavaScript syntax validation and 28 automated checks using a simulated DOM and native Canvas. These covered representative tool results, image formats and transparency, Unicode Base64, multiline CSV, known SHA-256 vectors, validation, routing, preferences, and cleanup.

Actual browser rendering, accessibility, clipboard/download permissions, navigation history, network behavior, and hosted deployment still require browser verification.

Before submitting changes, check the affected tools, resets, copy/download actions, error states, hash-route reloads, both themes, keyboard navigation, and mobile widths. Keep processing local and preserve the dependency-free static structure. Bug reports should include the browser, reproduction steps, and a small non-sensitive example.
