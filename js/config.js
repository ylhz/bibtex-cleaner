import { VENUE_MAPPING_DATA } from './venue_data.js';


export const CONSTANTS = {
    DEFAULT_FIELDS: ['author', 'title', 'booktitle', 'journal', 'year', 'pages'],
    ALL_FIELDS: ['author', 'title', 'booktitle', 'journal', 'year', 'pages', 'volume', 'number', 'doi', 'url', 'eprint', 'publisher', 'editor', 'month'],
    DEFAULT_FORMAT: "[Auth][Year][Title]_[Venue]",
    DEFAULT_MAPPINGS: VENUE_MAPPING_DATA
};



export const ConfigManager = {
    getFields() {
        return JSON.parse(localStorage.getItem('bib-fields')) || CONSTANTS.DEFAULT_FIELDS;
    },
    setFields(fields) {
        localStorage.setItem('bib-fields', JSON.stringify(fields));
    },
    getFormat() {
        return localStorage.getItem('bib-format') || CONSTANTS.DEFAULT_FORMAT;
    },
    setFormat(val) {
        localStorage.setItem('bib-format', val);
    },
    getMappings() {
        return localStorage.getItem('bib-mappings') || CONSTANTS.DEFAULT_MAPPINGS;
    },
    // 获取是否保留原 Key
    getKeepOriginal() {
        return localStorage.getItem('bib-keep-original') === 'true';
    },
    setKeepOriginal(val) {
        localStorage.setItem('bib-keep-original', val);
    },
    setMappings(val) {
        localStorage.setItem('bib-mappings', val);
    },
    reset() {
        localStorage.clear();
    },
    // 获取 Venue Mode
    getVenueMode() {
        return localStorage.getItem('bib-venue-mode') || 'abbr';
    },
    setVenueMode(val) {
        localStorage.setItem('bib-venue-mode', val);
    },
};