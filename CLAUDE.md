# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BibTeX Pro Formatter is a **100% client-side web application** that cleans, standardizes, and formats BibTeX entries for academic papers. It features DBLP integration, auto-learning venue abbreviations, and multi-format citation export.

**Key Philosophy: "Never Guess"** - The tool uses a strict 3-tier resolution strategy:
1. Custom/Learned Rules (exact match or regex from local storage)
2. DBLP Hint (when user clicks a search result)
3. Fallback (keep original full name and warn user)

## Architecture

### Core Files

```
js/
├── main.js           - UI orchestration, event handlers, DBLP search integration
├── processor.js      - BibTeX parsing, venue mapping, citation key generation
├── config.js         - LocalStorage manager, constants, auto-learning rules
├── utils.js          - Text processing utilities (author names, titles)
├── venue_data.js     - Default venue mapping rules (regex-based)
└── formatters/       - Output formatters (BibTeX, MLA, GB/T 7714)
    ├── bibtex.js
    ├── mla.js
    └── gbt7714.js
```

### Data Flow

1. **Input Sources:**
   - User pastes raw BibTeX → `dom.input`
   - User searches DBLP → `performSearch()` → clicks result → auto-fills input

2. **Processing Pipeline:**
   ```
   main.js:runConversion()
     ↓
   processor.js:processEntries()
     ├─ parseRawBibtex()           [Extract entries with regex]
     ├─ parseMappingRules()        [Load venue mapping rules]
     ├─ Venue resolution:
     │   1. Check customRules (LocalStorage learned rules)
     │   2. Check mappingRules (regex patterns from settings)
     │   3. Use hintVenue (from DBLP click)
     │   4. Fallback: keep original + warn
     ├─ Clean DBLP artifacts       [Remove 4-digit disambiguation numbers]
     └─ Generate citation keys     [Format: [Auth][Year][Title]_[Venue]]
     ↓
   formatters/[format].js          [Output as BibTeX/MLA/GB/T 7714]
     ↓
   main.js:renderOutput()          [Display in dom.output]
   ```

3. **Auto-Learning System:**
   - When user clicks DBLP result: `LAST_CLICKED_VENUE_HINT` captures venue
   - After fetch: `ConfigManager.addCustomRule(fullName, abbr)` saves to localStorage
   - Future conversions: `customRules[fullName]` provides instant match

### State Management

All state stored in browser's `localStorage` via `ConfigManager`:
- `bib-fields` - Which BibTeX fields to keep
- `bib-format` - Citation key format template
- `bib-mappings` - User-edited mapping rules (text)
- `bib-venue-mode` - Output mode: `'abbr'` or `'full'`
- `bib-keep-original` - Whether to preserve original citation keys
- `bib-custom-rules` - Auto-learned venue mappings (object)
- `bib-search-mode` - DBLP fetch mode: `'simple'` (metadata) or `'detailed'` (.bib file)

## Critical Implementation Details

### DBLP Search Modes

**Fast Mode (default, `simple`):**
- Uses only DBLP search API metadata
- Generates BibTeX from JSON in `generateBibFromJSON()`
- No additional network requests
- Learns venue rule immediately

**Precise Mode (`detailed`):**
- Fetches official .bib file via `fetchAndFillBibtex()`
- Tries: Primary URL → Proxy → HTML scraping fallback
- Parses with `parseRawBibtex()` regex
- Learns mapping from `booktitle`/`journal` → DBLP venue

### Venue Mapping Edge Cases

1. **NIPS → NeurIPS correction** (main.js:492, processor.js line references in generateBibFromJSON)
2. **Findings detection** (main.js:497-506, processor.js:104-113):
   - Checks `ee` field for 'findings' keyword
   - Prevents main conference rules from overriding (e.g., "ACL" rule won't match "ACL Findings")
3. **Word boundary protection** (processor.js:16-26):
   - Auto-wraps regex patterns with `\b(?:...)\b` to prevent false matches
   - "RAL" won't match inside "Neural"

### DBLP Author Name Cleaning

DBLP adds 4-digit disambiguation numbers to author names (e.g., "John Smith 0001"). These are stripped in processor.js:62-67 using regex `/ \d{4}/g`.

### Citation Key Generation

Template variables (processor.js:185-191):
- `[Auth]` - First author's last name, cleaned of special chars
- `[Year]` - Publication year
- `[Title]` - First significant word from `getTitleWord()`
- `[Venue]` - Abbreviated venue name
  - If `finalVenueId.length > 20`: Extract initials or truncate to 10 chars

## Development Workflow

### Running Locally

This is a static site with no build step:

```bash
# Serve locally (any static server works)
python -m http.server 8000
# or
npx serve .
# or
open index.html  # (May have CORS issues with DBLP API)
```

Then navigate to `http://localhost:8000`

### Testing Changes

1. **UI Changes**: Edit `index.html` or `css/style.css`
2. **Processing Logic**: Edit `js/processor.js`, reload page
3. **DBLP Integration**: Edit `js/main.js` functions: `performSearch()`, `fetchAndFillBibtex()`
4. **Output Formats**: Edit files in `js/formatters/`

**No transpilation or bundling required.** Use ES6 module imports (`type="module"` in index.html:258).

### Common Debugging

- Open browser DevTools Console for `console.log()` output
- Check localStorage in Application tab to inspect learned rules
- Network tab to debug DBLP API calls
- Warning modal: Click red warning text to see venue resolution issues

## Key Implementation Patterns

### Regex-Based BibTeX Parsing

`processor.js:parseRawBibtex()` uses:
- Entry regex: `/@(\w+)\s*\{([^,]*),([\s\S]*?)(?=@\w+\s*\{|\s*$)/g`
- Field regex: `/(\w+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)")(?=\s*,|\s*$)|(\w+)\s*=\s*(\d+)/g`

Handles both `key = {value}` and `key = "value"` formats, plus numeric values.

### Warning System

`main.js:handleWarnings()` displays count, `openWarningModal()` shows details. Warnings triggered when:
- Venue not in rule library (kept original)
- Used DBLP hint but no rule exists
- Mismatch between output and DBLP suggestion

### Auto-Convert on Settings Change

`main.js:setupAutoConvertListeners()` triggers conversion when:
- Field checkboxes toggled
- Venue mode radio changed
- ID format edited (500ms debounce)
- Mapping rules edited (500ms debounce)

This provides instant preview but saves network requests.

## Important Constraints

1. **No Server-Side Code**: All processing happens in browser. DBLP API calls use CORS proxies when needed.

2. **No npm/build system**: Pure vanilla JS with ES6 modules. Do not introduce build tools unless absolutely necessary.

3. **Regex Performance**: Mapping rules evaluated sequentially. Keep rule count reasonable (<500 lines) to maintain UI responsiveness.

4. **CORS Workarounds**:
   - DBLP search API: Direct access (has CORS headers)
   - .bib files: May need `api.allorigins.win` proxy
   - HTML scraping: Always needs proxy

5. **LocalStorage Limits**: Browser typically allows 5-10MB. Custom rules stored as JSON object, should stay under 1MB.

## Code Style Notes

- **Event handlers**: Arrow functions to preserve `this` context
- **DOM refs**: Cached in `dom` object at init time
- **Async/await**: Used for DBLP fetch operations
- **Toast notifications**: `showToast()` for non-blocking user feedback
- **No UI framework**: Vanilla DOM manipulation for minimal bundle size

## GitHub Pages Deployment

The repository uses GitHub Pages at `https://ylhz.github.io/bibtex-cleaner/`

**Base URL handling** (index.html:28-36):
```javascript
// Auto-detects GitHub Pages path and sets <base> tag
if (window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('vercel.app')) {
    const repoName = window.location.pathname.split('/')[1];
    // Sets <base href="/bibtex-cleaner/"> dynamically
}
```

When modifying asset paths, ensure they work both locally and on GitHub Pages.
