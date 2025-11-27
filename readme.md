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

  <h3>
    <a href="https://ylhz.github.io/bibtex-cleaner/">🚀 Live Demo</a>
  </h3>
</div>

---

## ✨ Features

- **⚡ Smart Cleaning**: Automatically remove redundant fields (e.g., `timestamp`, `bibsource`, `editor`) and keep only what you need.
- **🏷️ Venue Standardization**: Convert messy conference names (e.g., "Proceedings of the IEEE/CVF...") into standard abbreviations (**CVPR**) or clean full names.
- **🔑 Custom Citation Keys**: Generate consistent IDs like `[Auth][Year][Title][Venue]` (e.g., `Ren2025ImprovingCVPR`).
- **🌍 Multiple Formats**: 
  - **BibTeX** (Standard)
  - **MLA** (For humanities)
  - **GB/T 7714** (For Chinese thesis standards)
- **🔒 Privacy First**: **100% Client-side**. No data is sent to any server. Everything runs in your browser.
- **💾 Auto-Save**: Your custom settings and mapping rules are saved locally.

<!-- ## 📸 Screenshot

![Screenshot](https://via.placeholder.com/800x400?text=Please+Upload+Your+Screenshot) -->

## 🛠️ Usage

1. **Paste** your raw BibTeX entries into the input box.
2. Click **Convert**.
3. **Copy** the result directly to your LaTeX or Word document.

### Custom Mapping Rules
You can customize how venue names are standardized in the settings panel:

Format: `Regex => Abbreviation || Full Name`

Example:
```text
CVPR|Computer Vision and Pattern Recognition => CVPR || IEEE Conference on Computer Vision and Pattern Recognition
NeurIPS|NIPS => NeurIPS || Advances in Neural Information Processing Systems
ICML => ICML || International Conference on Machine Learning
```

### ❤️ Acknowledgements

Special thanks to **Gemini** for serving as an intelligent co-pilot during the development of this tool.