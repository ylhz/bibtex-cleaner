import { parseName } from '../utils.js';

// 辅助函数：首字母大写，其余小写
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function toGBT(entry, index, fullNameMode = false, showAllAuthors = false) {
    const f = entry.fields;
    const authors = (f.author || "").split(" and ");

    // 根据showAllAuthors决定显示多少作者
    const authorCount = showAllAuthors ? authors.length : Math.min(3, authors.length);
    let authList = authors.slice(0, authorCount).map(name => {
        let p = parseName(name);
        if (fullNameMode) {
            // 完整作者名：首字母大写，其余小写
            const lastName = capitalize(p.last);
            const firstName = p.first.split(' ').map(capitalize).join(' ');
            return `${lastName} ${firstName}`;  // Gao Lianli
        } else {
            return `${p.last.toUpperCase()} ${p.first.charAt(0)}`;  // GAO L
        }
    });

    // 只有在不显示所有作者且作者数大于3时才添加et al
    if (!showAllAuthors && authors.length > 3) authList.push("et al");
    
    let title = (f.title || "").replace(/[\{\}]/g, "");
    let type = entry.type.toLowerCase().includes("article") ? "[J]" : "[C]";
    if (entry.type.toLowerCase().includes("book")) type = "[M]";
    
    let venue = f.booktitle || f.journal || "";
    let pubInfo = f.year || "";
    if (f.volume) pubInfo += `, ${f.volume}`;
    if (f.number) pubInfo += `(${f.number})`;
    if (f.pages) pubInfo += `: ${f.pages.replace('--', '-')}`;
    
    return `[${index + 1}] ${authList.join(", ")}. ${title}${type}. ${venue}, ${pubInfo}.`;
}