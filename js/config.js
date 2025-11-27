export const CONSTANTS = {
    DEFAULT_FIELDS: ['author', 'title', 'booktitle', 'journal', 'year', 'pages'],
    ALL_FIELDS: ['author', 'title', 'booktitle', 'journal', 'year', 'pages', 'volume', 'number', 'doi', 'url', 'eprint', 'publisher', 'editor', 'month'],
    DEFAULT_FORMAT: "[Auth][Year][Title][Venue]",
    DEFAULT_MAPPINGS: `CVPRW|CVPR.*Workshop => CVPRW || CVPR Workshops
ICLRW|ICLR.*Workshop => ICLRW || ICLR Workshops
CVPR|Computer Vision and Pattern Recognition => CVPR || IEEE Conference on Computer Vision and Pattern Recognition
ICCV|International Conference on Computer Vision => ICCV || IEEE International Conference on Computer Vision
ECCV|European Conference on Computer Vision => ECCV || European Conference on Computer Vision
NeurIPS|NIPS|Neural Information Processing Systems => NIPS || Advances in Neural Information Processing Systems
ICML|International Conference on Machine Learning => ICML || International Conference on Machine Learning
ICLR|International Conference on Learning Representations => ICLR || International Conference on Learning Representations
AAAI|Association for the Advancement of Artificial Intelligence => AAAI || AAAI Conference on Artificial Intelligence
IJCAI|International Joint Conference on Artificial Intelligence => IJCAI || International Joint Conference on Artificial Intelligence
ACM MM|Multimedia => ACMMM || ACM International Conference on Multimedia
TPAMI|Pattern Analysis and Machine Intelligence => PAMI || IEEE Transactions on Pattern Analysis and Machine Intelligence
IJCV|International Journal of Computer Vision => IJCV || International Journal of Computer Vision
TIP|Transactions on Image Processing => TIP || IEEE Transactions on Image Processing`
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
    setMappings(val) {
        localStorage.setItem('bib-mappings', val);
    },
    reset() {
        localStorage.clear();
    },
    // 新增：获取 Venue Mode
    getVenueMode() {
        return localStorage.getItem('bib-venue-mode') || 'abbr';
    },
    setVenueMode(val) {
        localStorage.setItem('bib-venue-mode', val);
    },
};