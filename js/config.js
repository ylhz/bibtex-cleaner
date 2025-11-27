// 1. 计算机视觉 (CV)
const RULES_CV = `
# === Computer Vision (CV) ===
CVPRW|CVPR.*Workshop => CVPRW || CVPR Workshops
CVPR|Computer Vision and Pattern Recognition => CVPR || IEEE Conference on Computer Vision and Pattern Recognition
ICCV|International Conference on Computer Vision => ICCV || IEEE International Conference on Computer Vision
ECCV|European Conference on Computer Vision => ECCV || European Conference on Computer Vision
ACMMM|ACM MM|Multimedia => ACMMM || ACM International Conference on Multimedia
BMVC|British Machine Vision Conference => BMVC || British Machine Vision Conference
ACCV|Asian Conference on Computer Vision => ACCV || Asian Conference on Computer Vision
`;

// 2. 人工智能与机器学习 (AI & ML)
const RULES_AI = `
# === AI & Machine Learning ===
NeurIPS|NIPS|Neural Information Processing Systems => NIPS || Advances in Neural Information Processing Systems
ICML|International Conference on Machine Learning => ICML || International Conference on Machine Learning
ICLRW|ICLR.*Workshop => ICLRW || ICLR Workshops
ICLR|International Conference on Learning Representations => ICLR || International Conference on Learning Representations
AAAI|Association for the Advancement of Artificial Intelligence => AAAI || AAAI Conference on Artificial Intelligence
IJCAI|International Joint Conference on Artificial Intelligence => IJCAI || International Joint Conference on Artificial Intelligence
`;

// 3. 机器人 (Robotics)
const RULES_ROBOTICS = `
# === Robotics ===
ICRA|International Conference on Robotics and Automation => ICRA || IEEE International Conference on Robotics and Automation
IROS|International Conference on Intelligent Robots and Systems => IROS || IEEE/RSJ International Conference on Intelligent Robots and Systems
RSS|Robotics: Science and Systems => RSS || Robotics: Science and Systems
CoRL|Conference on Robot Learning => CoRL || Conference on Robot Learning
`;

// 自然语言处理 (NLP) - 新增
const RULES_NLP = `
# === NLP & Computational Linguistics ===
ACL|Association for Computational Linguistics => ACL || Association for Computational Linguistics
EMNLP|Empirical Methods in Natural Language Processing => EMNLP || Conference on Empirical Methods in Natural Language Processing
NAACL|North American Chapter of the Association for Computational Linguistics => NAACL || North American Chapter of the Association for Computational Linguistics
EACL|European Chapter of the Association for Computational Linguistics => EACL || European Chapter of the Association for Computational Linguistics
COLING|International Conference on Computational Linguistics => COLING || International Conference on Computational Linguistics
TACL|Transactions of the Association for Computational Linguistics => TACL || Transactions of the Association for Computational Linguistics
LREC|Language Resources and Evaluation => LREC || International Conference on Language Resources and Evaluation
WMT|Workshop on Machine Translation => WMT || Conference on Machine Translation
CoNLL|Computational Natural Language Learning => CoNLL || Conference on Computational Natural Language Learning
SemEval|Semantic Evaluation => SemEval || International Workshop on Semantic Evaluation
`;


// 期刊 (Journals)
const RULES_JOURNALS = `
# === Journals (CV/AI/Robotics) ===
TPAMI|Pattern Analysis and Machine Intelligence => PAMI || IEEE Transactions on Pattern Analysis and Machine Intelligence
IJCV|International Journal of Computer Vision => IJCV || International Journal of Computer Vision
TIP|Transactions on Image Processing => TIP || IEEE Transactions on Image Processing
TMM|Transactions on Multimedia => TMM || IEEE Transactions on Multimedia
PR$|Pattern Recognition$ => PR || Pattern Recognition
TCSVT|Circuits and Systems for Video Technology => TCSVT || IEEE Transactions on Circuits and Systems for Video Technology
SPL|Signal Processing Letters => SPL || IEEE Signal Processing Letters
CVIU|Computer Vision and Image Understanding => CVIU || Computer Vision and Image Understanding
TRO|Transactions on Robotics => TRO || IEEE Transactions on Robotics
IJRR|International Journal of Robotics Research => IJRR || The International Journal of Robotics Research
RAL|Robotics and Automation Letters => RAL || IEEE Robotics and Automation Letters
SciRob|Science Robotics => SciRob || Science Robotics
TASLP|Audio, Speech, and Language Processing => TASLP || IEEE/ACM Transactions on Audio, Speech, and Language Processing
CL|Computational Linguistics => CL || Computational Linguistics
`;


export const CONSTANTS = {
    DEFAULT_FIELDS: ['author', 'title', 'booktitle', 'journal', 'year', 'pages'],
    ALL_FIELDS: ['author', 'title', 'booktitle', 'journal', 'year', 'pages', 'volume', 'number', 'doi', 'url', 'eprint', 'publisher', 'editor', 'month'],
    DEFAULT_FORMAT: "[Auth][Year][Title][Venue]",
    DEFAULT_MAPPINGS: [
        RULES_CV,
        RULES_AI,
        RULES_NLP,
        RULES_ROBOTICS,
        RULES_JOURNALS
    ].join('\n').trim()
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
    // 新增：获取是否保留原 Key
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
    // 新增：获取 Venue Mode
    getVenueMode() {
        return localStorage.getItem('bib-venue-mode') || 'abbr';
    },
    setVenueMode(val) {
        localStorage.setItem('bib-venue-mode', val);
    },
};