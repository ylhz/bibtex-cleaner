
// 1. 计算机视觉, 图形学, 多媒体 (CV, Graphics, MM)
const RULES_CV_GRAPHICS = `
# === 1. Computer Vision, Graphics & Multimedia ===
CVPRW|CVPR.*Workshop => CVPRW || CVPR Workshops
CVPR|Computer Vision and Pattern Recognition => CVPR || IEEE/CVF Computer Vision and Pattern Recognition Conference
ICCV|International Conference on Computer Vision => ICCV || IEEE International Conference on Computer Vision
ECCV|European Conference on Computer Vision => ECCV || European Conference on Computer Vision
SIGGRAPH|Computer Graphics => SIGGRAPH || ACM SIGGRAPH Conference
ACMMM|ACM MM|Multimedia => ACMMM || ACM International Conference on Multimedia
BMVC|British Machine Vision Conference => BMVC || British Machine Vision Conference
ACCV|Asian Conference on Computer Vision => ACCV || Asian Conference on Computer Vision
TIP|Transactions on Image Processing => TIP || IEEE Transactions on Image Processing
TOG|Transactions on Graphics => TOG || ACM Transactions on Graphics
TVCG|Visualization and Computer Graphics => TVCG || IEEE Transactions on Visualization and Computer Graphics
TOMM|Multimedia Computing, Communications and Applications => TOMM || ACM Transactions on Multimedia Computing, Communications and Applications
TMM|Transactions on Multimedia => TMM || IEEE Transactions on Multimedia
CVIU|Computer Vision and Image Understanding => CVIU || Computer Vision and Image Understanding
`;

// 2. 人工智能与机器学习 (AI & ML)
const RULES_AI = `
# === 2. AI & Machine Learning ===
NeurIPS|NIPS|Neural Information Processing Systems => NeurIPS || Conference on Neural Information Processing Systems
ICML|International Conference on Machine Learning => ICML || International Conference on Machine Learning
ICLRW|ICLR.*Workshop => ICLRW || ICLR Workshops
ICLR|International Conference on Learning Representations => ICLR || International Conference on Learning Representations
AAAI|Association for the Advancement of Artificial Intelligence => AAAI || AAAI Conference on Artificial Intelligence
IJCAI|International Joint Conference on Artificial Intelligence => IJCAI || International Joint Conference on Artificial Intelligence
AISTATS|Artificial Intelligence and Statistics => AISTATS || International Conference on Artificial Intelligence and Statistics
COLT|Computational Learning Theory => COLT || Annual Conference on Computational Learning Theory
`;

// 3. 自然语言处理 (NLP)
const RULES_NLP = `
# === 3. NLP & Computational Linguistics ===
Findings of the Association for Computational Linguistics|Findings of ACL => ACL (Findings) || Findings of the Association for Computational Linguistics
ACL|Association for Computational Linguistics => ACL || Annual Meeting of the Association for Computational Linguistics
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

// 4. 机器人 (Robotics)
const RULES_ROBOTICS = `
# === 4. Robotics ===
ICRA|International Conference on Robotics and Automation => ICRA || IEEE International Conference on Robotics and Automation
IROS|International Conference on Intelligent Robots and Systems => IROS || IEEE/RSJ International Conference on Intelligent Robots and Systems
RSS|Robotics: Science and Systems => RSS || Robotics: Science and Systems
CoRL|Conference on Robot Learning => CoRL || Conference on Robot Learning
TRO|Transactions on Robotics => TRO || IEEE Transactions on Robotics
IJRR|International Journal of Robotics Research => IJRR || The International Journal of Robotics Research
RAL|Robotics and Automation Letters => RAL || IEEE Robotics and Automation Letters
SciRob|Science Robotics => SciRob || Science Robotics
`;

// 5. 计算机网络 (Networking) - 新增大类 (CCF)
const RULES_NETWORKING = `
# === 5. Computer Networks (CCF) ===
SIGCOMM|Protocols for Computer Communication => SIGCOMM || ACM International Conference on Applications, Technologies, Architectures, and Protocols for Computer Communication
MobiCom|Mobile Computing and Networking => MobiCom || ACM International Conference on Mobile Computing and Networking
INFOCOM|International Conference on Communications => INFOCOM || IEEE International Conference on Communications
NSDI|Network System Design and Implementation => NSDI || USENIX Symposium on Network System Design and Implementation
JSAC|Selected Areas in Communications => JSAC || IEEE Journal on Selected Areas in Communications
TMC|Mobile Computing => TMC || IEEE Transactions on Mobile Computing
TON|Transactions on Networking => TON || IEEE/ACM Transactions on Networking
TCOM|Transactions on Communications => TCOM || IEEE Transactions on Communications
TWC|Wireless Communications => TWC || IEEE Transactions on Wireless Communications
`;

// 6. 网络与信息安全 (Security) - 新增大类 (CCF)
const RULES_SECURITY = `
# === 6. Network & Information Security (CCF) ===
CCS|Computer and Communications Security => CCS || ACM Conference on Computer and Communications Security
EUROCRYPT|Applications of Cryptographic Techniques => EUROCRYPT || International Conference on the Theory and Applications of Cryptographic Techniques
S&P|Security and Privacy => S&P || IEEE Symposium on Security and Privacy
CRYPTO|International Cryptology Conference => CRYPTO || International Cryptology Conference
USENIX Security|Security Symposium => USENIX Security || USENIX Security Symposium
NDSS|Network and Distributed System Security Symposium => NDSS || Network and Distributed System Security Symposium
TDSC|Dependable and Secure Computing => TDSC || IEEE Transactions on Dependable and Secure Computing
TIFS|Information Forensics and Security => TIFS || IEEE Transactions on Information Forensics and Security
TOPS|Transactions on Privacy and Security => TOPS || ACM Transactions on Privacy and Security
JOC|Journal of Cryptology => JOC || Journal of Cryptology
`;

// 7. 数据库与数据挖掘 (DB, DM, IR) - 新增大类 (CCF)
const RULES_DB_DM_IR = `
# === 7. Database, Data Mining, Information Retrieval (CCF) ===
SIGMOD|SIGMOD Conference => SIGMOD || ACM SIGMOD Conference
SIGKDD|Knowledge Discovery and Data Mining => SIGKDD || ACM SIGKDD Conference on Knowledge Discovery and Data Mining
ICDE|Data Engineering => ICDE || IEEE International Conference on Data Engineering
VLDB|Very Large Data Bases => VLDB || International Conference on Very Large Data Bases
SIGIR|Information Retrieval => SIGIR || International ACM SIGIR Conference on Research and Development in Information Retrieval
TODS|Database Systems => TODS || ACM Transactions on Database Systems
TKDE|Knowledge and Data Engineering => TKDE || IEEE Transactions on Knowledge and Data Engineering
VLDBJ|The VLDB Journal => VLDBJ || The VLDB Journal
`;

// 8. 软件工程与程序设计语言 (SE & PL) - 新增大类 (CCF)
const RULES_SE_PL = `
# === 8. Software Engineering & PL (CCF) ===
PLDI|Programming Language Design and Implementation => PLDI || ACM SIGPLAN Conference on Programming Language Design and Implementation
POPL|Principles of Programming Languages => POPL || ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages
FSE/ESEC|Foundations of Software Engineering => FSE/ESEC || ACM Joint European Software Engineering Conference and Symposium on the Foundations of Software Engineering
ICSE|Software Engineering => ICSE || International Conference on Software Engineering
TOPLAS|Programming Languages and Systems => TOPLAS || ACM Transactions on Programming Languages and Systems
TOSEM|Software Engineering and Methodology => TOSEM || ACM Transactions on Software Engineering and Methodology
TSE|Software Engineering => TSE || IEEE Transactions on Software Engineering
TSC|Services Computing => TSC || IEEE Transactions on Services Computing
`;

// 9. 计算机科学理论 (Theory) - 新增大类 (CCF)
const RULES_THEORY = `
# === 9. Computer Science Theory (CCF) ===
STOC|Theory of Computing => STOC || ACM Symposium on the Theory of Computing
FOCS|Foundations of Computer Science => FOCS || IEEE Annual Symposium on Foundations of Computer Science
TIT|Information Theory => TIT || IEEE Transactions on Information Theory
SICOMP|SIAM Journal on Computing => SICOMP || SIAM Journal on Computing
`;

// 10. 遗留期刊 (General/Archived)
const RULES_LEGACY_JOURNALS = `
# === 10. Other Legacy Journals ===
PR$|Pattern Recognition$ => PR || Pattern Recognition
TCSVT|Circuits and Systems for Video Technology => TCSVT || IEEE Transactions on Circuits and Systems for Video Technology
SPL|Signal Processing Letters => SPL || IEEE Signal Processing Letters
TASLP|Audio, Speech, and Language Processing => TASLP || IEEE/ACM Transactions on Audio, Speech, and Language Processing
`;

// 导出所有拼接后的数据，供 config.js 导入
export const VENUE_MAPPING_DATA = [
    RULES_CV_GRAPHICS,
    RULES_AI,
    RULES_NLP,
    RULES_ROBOTICS,
    RULES_NETWORKING,
    RULES_SECURITY,
    RULES_DB_DM_IR,
    RULES_SE_PL,
    RULES_THEORY,
    RULES_LEGACY_JOURNALS
].join('\n').trim();