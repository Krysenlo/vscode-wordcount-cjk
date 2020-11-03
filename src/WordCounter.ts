import { WorkspaceConfiguration, workspace, Disposable } from "vscode";
import { DebugOutput } from "./debugOutput";

/**
 * Justify if a char is ASCII character.
 *
 * 0000-007F: C0 Controls and Basic Latin (ASCII)
 * 0080-00FF: C1 Controls and Latin-1 Supplement (Extended ASCII)
 *
 * Reference:
 * http://houfeng0923.iteye.com/blog/1035321 (Chinese)
 * https://en.wikipedia.org/wiki/Basic_Latin_(Unicode_block)
 * https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)
 *
 * @todo Current ASCII contains ASCII and Extended ASCII.
 * This sould be configurable in the future.
 */
const regASCII = "[\\u0000-\\u00FF]";

/**
 * Test if a char is a word character.
 *
 * The regular expression \w rule is used.
 * In Javascript it matches any alphanumeric character including the underscore.
 * Equivalent to [A-Za-z0-9_].
 *
 * @todo the word means should be configurable.
 */
const regWord = "\\w+";

/**
 * Test if a char is a white space.
 *
 * The regular expression \s rule is used.
 * In Javascript it matches a single white space character, including space,
 * tab, form feed, line feed.
 * Equivalent to [ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
 */
const regWhitespace = "\\s";

/**
 * Justify if a char is Chinese character.
 *
 * 4E00-9FFF: CJK Unified Ideographs
 * F900-FAFF: CJK Compatibility Ideographs
 *
 * Reference:
 * http://houfeng0923.iteye.com/blog/1035321 (Chinese)
 * https://en.wikipedia.org/wiki/CJK_Unified_Ideographs
 * https://en.wikipedia.org/wiki/CJK_Compatibility_Ideographs
 *
 * @todo Refine to contains only Chinese Chars.
 */
const regChinese = "[\\u4E00-\\u9FA5\\uF900-\\uFA2D]";

// code modify from https://write.qq.com/portal/public/editor/static/js/utils/countWords.js
namespace QiDian {
    const EN_SPACE = "\u0020";
    const CN_SPACE = "\u3000";
    const CR = "\r";
    const LF = "\n";
    const TAB = "\t";

    export function countRawWords(value: string) {
        value = value.replace(/\.\.\./g, "a");

        value = value.trim();

        if (!value) {
            return 0;
        }

        // 空白字符
        const connectWords: string[] = [
            EN_SPACE,
            CN_SPACE,
            CR,
            LF,
            TAB,
            "—",
            "-",
            "\u00A0",
        ];

        let count = 1;
        const initialCode = value.charCodeAt(0);
        let inWord =
            (initialCode >= 33 && initialCode <= 126) || initialCode === 167;
        for (let i = 1; i < value.length; i++) {
            const charCode = value.charCodeAt(i);
            const isChar = (charCode >= 33 && charCode <= 126) || charCode === 167;
            if (inWord && isChar) {
                continue;
            }
            const isConnectWord = connectWords.indexOf(value[i]) >= 0;
            if (isConnectWord) {
                inWord = false;
                continue;
            }
            count++;
            inWord = isChar;
        }

        return count;
    }
}
interface CustomRegexVar {
    name: string;
    regex: string;
    regexFlags?: string;
}

type CountFunc = (text: string) => number;

/**
 * The main class to provide counter functionality.
 */
export class WordCounter {
    private debug?: DebugOutput;
    /** 格式化函数 */
    private _replaceFuncs: { [key: string]: Function };

    private _internalVarsNames!: string[];
    private _internalVarsRegexMap!: Map<string, RegExp>;
    private _internalVarsFuncMap!: Map<string, CountFunc>;
    private _internalVarsNumMap!: Map<string, number>;

    private _customVarsNames!: string[];
    private _customVarsRegexMap!: Map<string, RegExp>;
    private _customVarsNumMap!: Map<string, number>;

    private readonly _regexFormatReplace: RegExp;

    private _disposable: Disposable;

    constructor(configuration: WorkspaceConfiguration, debug?: DebugOutput) {
        this._regexFormatReplace = /\$\{([^}]+)\}/g;
        this._replaceFuncs = {};
        this.getConfig(configuration);
        let subscriptions: Disposable[] = [];
        workspace.onDidChangeConfiguration(
            (e) => {
                if (e.affectsConfiguration("wordcount_cjk")) {
                    console.log("wordcount_cjk changed");
                    const configuration = workspace.getConfiguration("wordcount_cjk");
                    this.getConfig(configuration);
                }
            },
            this,
            subscriptions
        );
        this.debug = debug;
        this._disposable = Disposable.from(...subscriptions);
    }
    private getConfig(configuration: WorkspaceConfiguration) {
        const regexWordChar = configuration.get<string>("regexWordChar", "\\w+");
        const regexASCIIChar = configuration.get<string>(
            "regexASCIIChar",
            "[\\u0000-\\u00FF]"
        );
        const regexWhitespaceChar = configuration.get<string>(
            "regexWhitespaceChar",
            "\\s"
        );

        this._internalVarsNames = [];
        this._internalVarsRegexMap = new Map<string, RegExp>();
        this._internalVarsNumMap = new Map<string, number>();
        this._internalVarsFuncMap = new Map<string, CountFunc>();

        ([
            ["en_words", regexWordChar],
            ["ascii", regexASCIIChar],
            ["whitespace", regexWhitespaceChar],
            ["cjk", regChinese],
            ["total", (text) => text.length],
            ["qd", (text) => QiDian.countRawWords(text)],
        ] as [string, string | CountFunc][]).forEach((pair) => {
            const name = pair[0],
                val = pair[1];

            this._internalVarsNames.push(name);

            if (typeof val === "string") {
                this._internalVarsRegexMap.set(name, new RegExp(val, "g"));
            } else if (typeof val === "function") {
                this._internalVarsFuncMap.set(name, val);
            }
        });

        this._customVarsNames = [];
        this._customVarsRegexMap = new Map<string, RegExp>();
        this._customVarsNumMap = new Map<string, number>();
        configuration.get<CustomRegexVar[]>("customVars", [
            {
                "name": "中文字数",
                "regex": "[\\u4E00-\\u9FA5\\uF900-\\uFA2D]"
            },
            {
                "name": "英文单词数",
                "regex": "[a-zA-Z_]+"
            },
            {
                "name": "ascii",
                "regex": "[\\u0000-\\u00FF]"
            },
            {
                "name": "空白",
                "regex": "\\s"
            },
            {
                "name": "常用标点符号",
                "regex": "[，。；“”‘’：,.;\"']"
            },
            {
                "name": "非中文非ASCII",
                "regex": "[^\\u0000-\\u00FF\\u4E00-\\u9FA5\\uF900-\\uFA2D]"
            },
            {
                "name": "空行",
                "regex": "\\n(?=\\r?\\n)"
            }
        ]).forEach((customRegexVar) => {
            const name = customRegexVar.name;
            let flag;
            if (customRegexVar.regexFlags === undefined) {
                flag = 'g';
            } else {
                flag = customRegexVar.regexFlags;
                if (customRegexVar.regexFlags.match('g') === null) {
                    flag += 'g';
                }
            }
            this._customVarsNames.push(name)
            this._customVarsRegexMap.set(name, new RegExp(customRegexVar.regex, flag));
            this._customVarsNumMap.set(name, 0);
        });
    }

    private _regexVarCount(
        text: string,
        regexMap: Map<string, RegExp>,
        varName: string,
        numMap: Map<string, number>
    ) {
        let num = 0;
        let regexp = regexMap.get(varName);
        if (regexp === undefined) return;
        let result;
        if (regexp.global === false) {
            regexp = new RegExp(regexp.source, regexp.flags + "g");
            regexMap.set(varName, regexp);
        }
        while ((result = regexp.exec(text)) !== null) {
            num++;
        }
        numMap.set(varName, num);
    }

    private _regexVarsCount(
        text: string,
        regexMap: Map<string, RegExp>,
        numMap: Map<string, number>
    ) {
        regexMap.forEach((regexp, key) => {
            this._regexVarCount(text, regexMap, key, numMap);
        });
        if (this.debug) {
            for (const item of numMap) {
                this.debug.appendLine(`${item[0]}: ${item[1]}`);
            }
        }
    }

    private _internalVarsCount(text: string) {
        this._regexVarsCount(
            text,
            this._internalVarsRegexMap,
            this._internalVarsNumMap
        );
        this._internalVarsFuncMap.forEach((func, key) => {
            this._internalVarsNumMap.set(key, func(text));
        });
    }

    private _customVarsCount(text: string) {
        this._regexVarsCount(
            text,
            this._customVarsRegexMap,
            this._customVarsNumMap
        );
    }

    public count(text: string) {
        this.debug?.appendLine("====== count ======");
        this._internalVarsCount(text);
        this._customVarsCount(text);
    }

    public format(fmt: string): string {
        const _this = this;

        return fmt.replace(this._regexFormatReplace, (matches, expr) => {
            if (!_this._replaceFuncs[matches]) {
                _this._replaceFuncs[matches] = _this._compileExpiession(expr);
            }

            const f = _this._replaceFuncs[matches];
            const customVars = new Array();
            for (const item of this._internalVarsNumMap) {
                customVars.push(item[1]);
            }
            for (const item of this._customVarsNumMap) {
                customVars.push(item[1]);
            }
            return f(...customVars);
        });
    }

    private _compileExpiession(expr: string) {
        const f = new Function(
            ...this._internalVarsNames,
            ...this._customVarsNames,
            `return ${expr};`
        );

        try {
            const customVars = new Array();
            for (const item of this._internalVarsNames) {
                customVars.push(0);
            }
            for (const item of this._customVarsNames) {
                customVars.push(0);
            }
            f(...customVars);
        } catch (e) {
            return new Function(
                ...this._internalVarsNames,
                ...this._customVarsNames,
                `return '无效表达式: ${expr}';`
            );
        }

        return f;
    }

    dispose() {
        this._disposable.dispose();
    }
}
