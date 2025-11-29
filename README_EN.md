
<div align="center">
<img src="favicon.svg" width="120" alt="Logo" />
<h1>BibTeX Pro Formatter</h1>

<p>
<strong>The ultimate tool for researchers to clean BibTeX, standardize venue names, and generate citation keys automatically.</strong>
</p>



  <p>
    <a href="https://github.com/ylhz/bibtex-cleaner/issues">
      <img src="https://img.shields.io/github/issues/ylhz/bibtex-cleaner?color=red&style=flat-square" alt="Issues" />
    </a>
    <a href="https://github.com/ylhz/bibtex-cleaner/stargazers">
      <img src="https://img.shields.io/github/stars/ylhz/bibtex-cleaner?color=yellow&style=flat-square" alt="Stars" />
    </a>
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
  </p>

<p>
<a href="./README.md">
[中文]
</a>
<a href="./README_EN.md">
[English]
</a>
</p>

<h3>
<a href="https://ylhz.github.io/bibtex-cleaner/">🚀 Live Demo</a>
</h3>
</div>

-----

## ✨ Features


  - **🧠 Auto-Learning System**: Click a result in the DBLP search bar, and the tool **permanently learns** the mapping between that specific paper's full venue name and its abbreviation (stored locally).
  - **⚡ Smart Cleaning**: Automatically remove redundant fields (e.g., `timestamp`, `bibsource`, `editor`) and keep only what you need.
  - **🏷️ Standardization**: Convert messy conference names (e.g., "Proceedings of the IEEE/CVF...") into standard abbreviations (**CVPR**) or clean full names.
  - **🔑 Custom Citation Keys**: Generate consistent IDs like `[Auth][Year][Title]_[Venue]` (e.g., `he2016deep_cvpr`). Long venue names in IDs are automatically truncated/acronymized.
  - **🌍 Multiple Formats**:
      - **BibTeX** (Standard)
      - **MLA** (For humanities)
      - **GB/T 7714** (For Chinese thesis standards)
  - **🔒 Privacy First**: **100% Client-side**. No data is sent to any server. Everything runs in your browser.

## 🛠️ How It Works (The "No Guessing" Logic)

To ensure 100% accuracy for academic citations, we use a strict 3-tier resolution strategy:

1.  **Custom/Learned Rules**: First, we check your locally learned rules (Exact Match) and the built-in regex library.
2.  **DBLP Hint**: If you are processing a single entry and have clicked a suggestion from the DBLP search bar, we trust the DBLP official abbreviation.
3.  **Fallback**: If neither of the above matches, we **keep the original full name** and flag a warning. 

## 🚀 Usage

1.  **Search & Learn (Recommended)**:
      * Type the paper title in the left **Search Bar**.
      * Click the correct paper from DBLP results.
      * The tool fills the BibTeX *and* learns the correct Venue Abbreviation automatically.
2.  **Batch Conversion**:
      * Paste multiple BibTeX entries into the input box.
      * Click **Convert**.
3.  **Check Warnings**:
      * If you see a red **⚠️ Warning** label, click it to see which venues are unknown or mismatched.
4.  **Copy**: Copy the result to your LaTeX/Word document.

## ⚙️ Configuration

Open the **Settings Drawer** (top-right corner) to customize your workflow.

### Citation Key Format

Customize how IDs are generated using variables:

  * `[Auth]`: First author's last name (e.g., `vaswani`)
  * `[Year]`: Publication year (e.g., `2017`)
  * `[Title]`: First significant word of title (e.g., `attention`)
  * `[Venue]`: Abbreviation (e.g., `nips`). *Note: If the venue name is unknown and very long, it will be smartly shortened in the ID.*

### Mapping Rules

You can manually add rules or export the rules you've learned via "Auto-Learning".

**Format:** `Regex => Abbreviation || Full Name`

**Example:**

```text
# Basic Rules
CVPR|Computer Vision and Pattern Recognition => CVPR || IEEE Conference on Computer Vision and Pattern Recognition
NeurIPS|NIPS => NeurIPS || Advances in Neural Information Processing Systems

# Note: The system automatically handles word boundaries (\b), 
# so "RAL" will NOT match inside "Neural".
```

### Export Learned Rules

Used the tool for a while? Your local storage now contains accurate mappings based on your usage.
Click **"Export Learned Rules"** in settings to get a text list. You can submit these to us to improve the default library\!

## ❤️ Acknowledgements

Special thanks to **Gemini** for serving as an intelligent co-pilot during the development of this tool.