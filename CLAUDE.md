# BibTeX Pro Formatter - AI 助手开发指南

> **最后更新时间：** 2026-01-21 18:59
> 
> 本文件为 Claude Code 和 GitHub Copilot 提供代码开发指导。

## 项目概述

BibTeX Pro Formatter 是一个 **100% 客户端 Web 应用**，用于清理、标准化和格式化学术论文的 BibTeX 条目。主要功能包括：
- DBLP 集成与自动学习场所缩写
- 多格式引用导出（BibTeX、MLA、GB/T 7714）
- 批量处理模式与警告检测
- 批量验证模式 - 验证论文是否在 DBLP 中真实存在

**核心理念："永不猜测"** - 工具使用严格的三层解析策略：
1. 自定义/学习规则（从本地存储精确匹配或正则匹配）
2. DBLP 提示（用户点击搜索结果时）
3. 回退方案（保留原始全名并警告用户）

## 技术栈
- **纯 JavaScript (ES6 模块)** - 无框架（React/Vue/Angular）
- **原生 DOM 操作** - 直接使用 querySelector/createElement
- **LocalStorage** - 持久化配置
- **无构建工具** - 直接在浏览器中运行

## 架构

### 核心文件

```
js/
├── main.js           - 单条模式、DBLP 搜索、UI 编排
├── batch-mode.js     - 批量模式逻辑、条目管理
├── processor.js      - BibTeX 解析、场所映射、引用键生成
├── config.js         - ConfigManager 单例、常量
├── utils.js          - 文本处理工具（作者名、标题）
├── venue_data.js     - 默认场所映射规则（基于正则）
├── warning-system.js - 警告检测和过滤
├── ai-detector.js    - AI 生成内容检测
├── dblp-validator.js - DBLP 批量验证与匹配算法
└── formatters/       - 输出格式化器（BibTeX、MLA、GB/T 7714）
    ├── bibtex.js
    ├── mla.js
    └── gbt7714.js
```

### 数据流

1. **输入来源：**
   - 用户粘贴原始 BibTeX → `dom.input`
   - 用户搜索 DBLP → `performSearch()` → 点击结果 → 自动填充输入
   - 批量模式 → 解析多个条目 → 逐个处理

2. **处理流程：**
   ```
   main.js:runConversion() / batch-mode.js:parseBatchInput()
     ↓
   processor.js:processEntries()
     ├─ parseRawBibtex()           [用正则提取条目]
     ├─ parseMappingRules()        [加载场所映射规则]
     ├─ 场所解析：
     │   1. 检查 customRules（LocalStorage 学习规则）
     │   2. 检查 mappingRules（设置中的正则模式）
     │   3. 使用 hintVenue（来自 DBLP 点击）
     │   4. 回退：保留原始 + 警告
     ├─ 清理 DBLP 伪影           [移除四位数消歧编号]
     └─ 生成引用键               [格式：[Auth][Year][Title]_[Venue]]
     ↓
   formatters/[format].js          [输出为 BibTeX/MLA/GB/T 7714]
     ↓
   main.js:renderOutput() / batch-mode.js:renderEntriesList()
   ```

3. **自动学习系统：**
   - 用户点击 DBLP 结果时：`LAST_CLICKED_VENUE_HINT` 捕获场所
   - 获取后：`ConfigManager.addCustomRule(fullName, abbr)` 保存到 localStorage
   - 未来转换：`customRules[fullName]` 提供即时匹配

### 状态管理

**单条模式：**
- `CURRENT_DATA` - 已处理的 BibTeX 数据
- `CURRENT_WARNINGS` - 验证警告
- `CURRENT_TAB` - 当前输出格式

**批量模式：**
- `BatchModeState.entries` - 所有条目数组
- `BatchModeState.isActive` - 模式切换
- `BatchModeState.currentFilter` - 当前筛选器（'all', 'warnings', 'ignored', 'ai', 'confirmed'）
- `BatchModeState.ignoredWarnings` - 已忽略的警告类型

**LocalStorage（通过 ConfigManager）：**
- `bib-fields` - 保留哪些 BibTeX 字段
- `bib-format` - 引用键格式模板
- `bib-mappings` - 用户编辑的映射规则（文本）
- `bib-venue-mode` - 输出模式：`'abbr'` 或 `'full'`
- `bib-keep-original` - 是否保留原始引用键
- `bib-custom-rules` - 自动学习的场所映射（对象）
- `bib-search-mode` - DBLP 获取模式：`'simple'`（元数据）或 `'detailed'`（.bib 文件）
- `bib-ignored-warnings` - 批量模式已忽略警告

## 代码风格与约定

### 语言规范
- **所有面向开发者的文件和注释使用简体中文**
- 包括但不限于：代码注释、文档、README、提交信息
- 用户界面文本根据目标用户语言设置
- 变量名、函数名仍使用英文（遵循 JavaScript 惯例）

### JavaScript
- 使用 ES6 模块，显式导入/导出
- 回调和事件处理器使用箭头函数
- 异步操作使用 async/await
- 适当使用对象解构
- HTML 生成使用模板字面量

### 命名约定
- 函数：`camelCase`（如 `handleSearchDBLP`、`updateStats`）
- 常量：`UPPER_SNAKE_CASE`（如 `CURRENT_DATA`、`BATCH_MODE_STATE`）
- DOM 引用：缓存在 `dom` 对象中
- 事件处理器：以 `handle` 开头（如 `handleRecheck`、`handleIgnoreEntry`）

## 关键实现规则

### 1. DOM 操作
- **缓存 DOM 引用**到模块级 `dom` 对象
- 使用 `querySelector` / `querySelectorAll` - 避免 jQuery 模式
- 动态内容使用 `innerHTML` 配合模板字面量
- 始终使用 `escapeHtml()` 工具转义用户输入

### 2. 状态管理
- 单条模式：`CURRENT_DATA`、`CURRENT_WARNINGS`、`CURRENT_TAB`
- 批量模式：`BatchModeState` 对象包含条目数组
- 不要直接修改状态 - 使用更新函数
- 状态变更后调用 `updateStats()` 和 `renderEntriesList()`

### 3. BibTeX 处理
- 使用 `parseRawBibtex()` 解析（processor.js 中基于正则的解析器）
- 使用 `processEntries()` 处理（场所映射、字段过滤、ID 生成）
- 使用 `toBibTeX()` / `toMLA()` / `toGBT()` 格式化输出
- 尽可能保留原始结构

### 4. 警告系统
- 使用 `detectWarnings(entry, processingResult)` 检测
- 存储在 `entry.warnings` 数组中
- 支持忽略标志：`entry.isIgnored = true`
- 警告解决时自动清除：检查 `warnings.length === 0`

### 5. 批量模式特定规则
- 条目具有状态：`warnings`、`isIgnored`、`isAISuspected`
- 筛选器：'all'、'warnings'、'ignored'、'ai'、'confirmed'
- **"已确认"** = 无警告且未忽略
- **"已忽略"** = `isIgnored = true`（保留警告以便编辑）
- 编辑后点击"🔄 检查"重新验证
- 警告解决后自动清除 `isIgnored` 标志

### 6. DBLP 集成

**快速模式（默认，`simple`）：**
- 仅使用 DBLP 搜索 API 元数据
- 在 `generateBibFromJSON()` 中从 JSON 生成 BibTeX
- 无额外网络请求
- 立即学习场所规则

**精准模式（`detailed`）：**
- 通过 `fetchAndFillBibtex()` 获取官方 .bib 文件
- 尝试：主 URL → 代理 → HTML 抓取回退
- 使用 `parseRawBibtex()` 正则解析
- 从 `booktitle`/`journal` → DBLP 场所学习映射

### 7. ConfigManager 使用
- 获取字段：`ConfigManager.getFields()`（不是 getFieldsConfig）
- 获取格式：`ConfigManager.getFormat()`（不是 getIDFormat）
- 获取场所模式：`ConfigManager.getVenueMode()`（'abbr' | 'full'）
- 自定义规则：`ConfigManager.getCustomRules()` 返回对象
- 保留原始：`ConfigManager.getKeepOriginal()` 返回布尔值

### 8. 场所映射边界情况

1. **NIPS → NeurIPS 修正**（main.js、processor.js 的 generateBibFromJSON）
2. **Findings 检测**：
   - 检查 `ee` 字段是否包含 'findings' 关键字
   - 防止主会议规则覆盖（例如 "ACL" 规则不会匹配 "ACL Findings"）
3. **词边界保护**：
   - 自动用 `\b(?:...)\b` 包裹正则模式以防止误匹配
   - "RAL" 不会匹配 "Neural" 内部

## 常用模式

### 在批量模式中添加按钮操作
```javascript
// 1. HTML 生成（createEntryCard）
<button data-action="my-action" data-entry-index="${index}">标签</button>

// 2. 事件绑定（bindCardEvents）
card.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    handleEntryAction(btn.dataset.action, index, entry);
  });
});

// 3. 操作处理器（handleEntryAction）
case 'my-action':
  handleMyAction(index);
  break;
```

### 编辑后更新条目（批量模式）
```javascript
// 1. 解析新 BibTeX
const parsed = parseRawBibtex(newText);

// 2. 使用当前设置转换
const resultObj = processEntries(
  [parsed[0]],
  ConfigManager.getFields(),
  ConfigManager.getFormat(),
  ConfigManager.getVenueMode(),
  ConfigManager.getKeepOriginal(),
  null,
  ConfigManager.getCustomRules()
);

// 3. 检测警告
const flatEntry = { 
  type: parsed[0].type, 
  id: parsed[0].key, 
  ...parsed[0].fields 
};
const warnings = detectWarnings(flatEntry, resultObj);

// 4. 更新条目对象
entry.warnings = warnings;
entry.convertedBibtex = toBibTeX(resultObj.data[0]);

// 5. 如果已解决则自动清除忽略标志
if (entry.isIgnored && warnings.length === 0) {
  entry.isIgnored = false;
}

// 6. 刷新 UI
updateStats();
renderEntriesList();
```

### Toast 通知
```javascript
showToast('成功消息');  // 自动消失
showToast('错误：' + err.message);  // 用户友好错误
```

## 开发工作流

### 本地运行


测试时不自动启动服务器，开发者手动运行服务器测试，例如：

```bash
# 本地服务（任何静态服务器都可以）
python -m http.server 8000
# 或
npx serve .
# 或使用 VS Code 的 Live Server 扩展
```

然后访问 `http://localhost:8000`

### 测试更改

1. **UI 更改**：编辑 `index.html` 或 `css/style.css`、`css/batch-mode.css`
2. **处理逻辑**：编辑 `js/processor.js`，重新加载页面
3. **DBLP 集成**：编辑 `js/main.js` 函数：`performSearch()`、`fetchAndFillBibtex()`
4. **批量模式**：编辑 `js/batch-mode.js`
5. **输出格式**：编辑 `js/formatters/` 中的文件

**无需转译或打包。** 在 index.html 中使用 ES6 模块导入（`type="module"`）。

### 常见调试

- 打开浏览器开发者工具控制台查看 `console.log()` 输出
- 在应用程序选项卡中检查 localStorage 以查看学习规则
- 网络选项卡调试 DBLP API 调用
- 警告模态框：点击红色警告文本查看场所解析问题
- 批量模式：检查控制台中的"条目操作:"、"检查条目:"日志

## 关键实现模式

### 基于正则的 BibTeX 解析

`processor.js:parseRawBibtex()` 使用：
- 条目正则：`/@(\w+)\s*\{([^,]*),([\s\S]*?)(?=@\w+\s*\{|\s*$)/g`
- 字段正则：`/(\w+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)")(?=\s*,|\s*$)|(\w+)\s*=\s*(\d+)/g`

同时处理 `key = {value}` 和 `key = "value"` 格式，以及数值。

### DBLP 作者名清理

DBLP 在作者名后添加四位数消歧编号（如 "John Smith 0001"）。这些在 processor.js 中使用正则 `/ \d{4}/g` 剥离。

### 引用键生成

模板变量（processor.js）：
- `[Auth]` - 第一作者姓氏，清理特殊字符
- `[Year]` - 发表年份
- `[Title]` - 从 `getTitleWord()` 获取的第一个有意义单词
- `[Venue]` - 缩写的场所名称
  - 如果 `finalVenueId.length > 20`：提取首字母或截断到 10 个字符

### DBLP 批量验证

**验证流程**（dblp-validator.js）：
1. **搜索 DBLP**：使用 DBLP 搜索 API（`https://dblp.org/search/publ/api`）
2. **匹配算法**：综合考虑标题、作者、年份的相似度
   - 标题相似度（权重 60%）：使用 Jaccard 相似度 + Levenshtein 编辑距离
   - 年份匹配（权重 20%）：完全匹配
   - 作者匹配（权重 20%）：姓氏匹配即可
3. **匹配阈值**：相似度 > 70% 视为匹配
4. **未匹配处理**：自动标记为 `isAISuspected = true`，添加到 AI 疑似列表

**标题规范化**：
- 转小写、移除标点
- 移除停用词（a, an, the, and, or, in, on, ...）
- 用于提高匹配准确率

**作者规范化**：
- 提取姓氏（最后一个单词）
- 姓氏匹配即认为是同一作者（允许名字缩写不同）

**API 限流**：每个请求间隔 500ms，避免触发 DBLP 限流

**使用场景**：
- 批量模式中点击"🔍 验证全部"按钮
- 自动检测虚假论文或 AI 生成的条目
- 验证结果存储在 `entry.dblpVerified`、`entry.dblpMatched`、`entry.dblpConfidence`

## 重要约束

1. **无服务器端代码**：所有处理都在浏览器中进行。需要时 DBLP API 调用使用 CORS 代理。

2. **无 npm/构建系统**：纯原生 JS 配合 ES6 模块。除非绝对必要，否则不要引入构建工具。

3. **正则性能**：映射规则按顺序评估。保持规则数量合理（<500 行）以维持 UI 响应性。

4. **CORS 解决方案**：
   - DBLP 搜索 API：直接访问（有 CORS 头）
   - .bib 文件：可能需要 `api.allorigins.win` 代理
   - HTML 抓取：始终需要代理

5. **LocalStorage 限制**：浏览器通常允许 5-10MB。自定义规则作为 JSON 对象存储，应保持在 1MB 以下。

## 测试检查清单
- [ ] 单条模式转换正常
- [ ] 批量模式解析多个条目
- [ ] DBLP 搜索正确获取和填充
- [ ] 警告检测识别问题
- [ ] 忽略/重新检查流程正确更新状态
- [ ] 筛选器芯片显示正确计数（全部、警告、已忽略、AI、已确认）
- [ ] LocalStorage 持久化设置
- [ ] 所有三种输出格式正确渲染
- [ ] **DBLP 批量验证**：验证全部按钮正常工作，进度显示正确
- [ ] **验证匹配**：匹配的论文不标记为 AI 疑似，未匹配的自动标记

## 调试技巧
- 在函数入口添加 `console.log()` 及参数
- 检查 `entry.warnings` 数组结构
- 验证 `isIgnored` 标志状态
- 在控制台检查 `BatchModeState.entries`
- 查找 `parseRawBibtex()` 中的解析错误
- 使用 `ConfigManager.getCustomRules()` 验证场所映射
- 检查方法名：使用 `getFields()` 而不是 `getFieldsConfig()`

## 性能注意事项
- 批量模式高效处理 100+ 条目
- 编辑器输入事件防抖（300ms）
- 批量 DOM 插入使用 DocumentFragment
- 在模块作用域缓存正则模式
- 避免布局抖动 - 批量进行 DOM 读写

## 无障碍性
- 使用语义化 HTML（button、nav、aside）
- 维护键盘导航
- 图标按钮添加 ARIA 标签
- 模态框/对话框焦点管理
- 警告色彩对比度（WCAG AA）

## GitHub Pages 部署

仓库使用 GitHub Pages 部署于 `https://ylhz.github.io/bibtex-cleaner/`

**基础 URL 处理**（index.html）：
```javascript
// 自动检测 GitHub Pages 路径并设置 <base> 标签
if (window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('vercel.app')) {
    const repoName = window.location.pathname.split('/')[1];
    // 动态设置 <base href="/bibtex-cleaner/">
}
```

修改资源路径时，确保本地和 GitHub Pages 上都能正常工作。
