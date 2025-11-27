import { parseName } from '../utils.js';

export function toMLA(entry) {
    const f = entry.fields;
    const authors = (f.author || "").split(" and ");
    let authStr = "";
    
    if (authors.length === 1) {
        let p = parseName(authors[0]);
        authStr = `${p.last}, ${p.first}.`;
    } else if (authors.length === 2) {
        let p1 = parseName(authors[0]);
        let p2 = parseName(authors[1]);
        authStr = `${p1.last}, ${p1.first}, and ${p2.first} ${p2.last}.`;
    } else if (authors.length > 2) {
        let p = parseName(authors[0]);
        authStr = `${p.last}, ${p.first}, et al.`;
    }
    
    let title = (f.title || "").replace(/[\{\}]/g, "");
    let container = f.booktitle || f.journal || "";
    let details = [];
    if (f.volume) details.push(`vol. ${f.volume}`);
    if (f.number) details.push(`no. ${f.number}`);
    if (f.year) details.push(f.year);
    if (f.pages) details.push(`pp. ${f.pages.replace('--', '-')}`);
    
    return `${authStr} "${title}." ${container}, ${details.join(", ")}.`;
}