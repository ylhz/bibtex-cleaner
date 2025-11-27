import { parseName } from '../utils.js';

export function toGBT(entry, index) {
    const f = entry.fields;
    const authors = (f.author || "").split(" and ");
    let authList = authors.slice(0, 3).map(name => {
        let p = parseName(name);
        return `${p.last.toUpperCase()} ${p.first.charAt(0)}`;
    });
    if (authors.length > 3) authList.push("et al");
    
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