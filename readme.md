
<div align="center">
<img src="icon.svg" width="120" alt="Logo" />
<h1>BibTeX Pro Formatter</h1>

<p>
<strong>科研人员的终极工具：清洗 BibTeX、标准化会议名称、自动生成引用 Key。</strong>
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

## ✨ 核心特性


  - **🧠 自动学习系统**：只要你在左侧 DBLP 搜索栏点击了一个结果，系统就会**自动且永久地学习**该论文的全称与缩写的对应关系（存储在本地）。
  - **⚡ 智能清洗**：自动移除冗余字段（如 `timestamp`, `bibsource`, `editor`），只保留你需要的核心信息。
  - **🏷️ 标准化**：将混乱的会议名称（如 "Proceedings of the IEEE/CVF..."）统一转换为标准的缩写（**CVPR**）或整洁的全称。
  - **🔑 自定义引用 Key**：生成风格统一的 ID，如 `[Auth][Year][Title]_[Venue]` (例如 `he2016deep_cvpr`)。如果 ID 中的会议名过长，会自动进行缩写处理。
  - **🌍 多格式支持**：
      - **BibTeX** (标准格式)
      - **MLA** (人文学科)
      - **GB/T 7714** (中文学位论文标准)
  - **🔒 隐私优先**：**100% 纯前端运行**。没有任何数据会发送到服务器，所有操作都在你的浏览器中完成。

## 🛠️ 工作原理 (“绝不瞎猜”逻辑)

为了确保学术引用的 100% 准确性，我们采用了严格的三级解析策略：

1.  **自定义/已学习规则**：优先检查你本地学习到的规则（完全匹配）以及内置的正则规则库。
2.  **DBLP 提示 (Hint)**：如果你正在处理单条数据，且点击了左侧搜索栏的建议，我们将直接采纳 DBLP 官方提供的缩写。
3.  **兜底策略 (Fallback)**：如果上述两者都未命中，我们将**保留原始全称**并弹出警告。

## 🚀 使用方法

1.  **搜索并学习 (推荐)**：
      * 在左侧 **Search Bar** 输入论文标题。
      * 点击正确的 DBLP 搜索结果。
      * 工具会自动填入 BibTeX，并自动**学习**该会议正确的缩写映射。
2.  **批量转换**：
      * 将多条 BibTeX 粘贴到输入框中。
      * 点击 **Convert** 按钮。
3.  **检查警告**：
      * 如果你看到红色的 **⚠️ Warning** 提示，点击它查看哪些会议是未知的或不匹配的。
4.  **复制**：
      * 点击 **Copy Result**，直接粘贴到你的 LaTeX 或 Word 文档中。

## ⚙️ 设置 (Configuration)

点击右上角的设置按钮打开 **Settings Drawer**，自定义你的工作流。

### 引用 Key 格式 (Citation Key Format)

使用变量自定义 ID 生成规则：

  * `[Auth]`: 第一作者的姓氏 (例如 `vaswani`)
  * `[Year]`: 出版年份 (例如 `2017`)
  * `[Title]`: 标题的第一个实词 (例如 `attention`)
  * `[Venue]`: 会议缩写 (例如 `nips`)。*注意：如果 ID 中的会议名未知且过长，系统会智能截断。*

### 映射规则 (Mapping Rules)

你可以手动添加规则，或者导出通过“自动学习”积累的规则。

**格式:** `Regex => Abbreviation || Full Name`

**示例:**

```text
# 基础规则
CVPR|Computer Vision and Pattern Recognition => CVPR || IEEE Conference on Computer Vision and Pattern Recognition
NeurIPS|NIPS => NeurIPS || Advances in Neural Information Processing Systems

# 注意：系统会自动处理单词边界 (\b)，
# 所以 "RAL" 不会错误匹配到 "Neural" 单词内部。
```

### 导出已学习规则 (Export Learned Rules)

使用一段时间后，你的本地存储中会积累大量精准的映射关系。
点击设置中的 **"Export Learned Rules"** 按钮，可以获得一份文本列表。欢迎提交给我们，帮助改进默认规则库！

## ❤️ 致谢

特别感谢 **Gemini** 在本项目开发过程中担任智能 Copilot。