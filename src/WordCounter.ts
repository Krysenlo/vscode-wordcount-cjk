import { WorkspaceConfiguration, workspace } from "vscode";
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
    const connectWords: string[] = [EN_SPACE, CN_SPACE, CR, LF, TAB, "—", "-", "\u00A0"];

    let count = 1;
    const initialCode = value.charCodeAt(0);
    let inWord = (initialCode >= 33 && initialCode <= 126) || initialCode === 167;
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

interface CustomRegexVar {
    name: string;
    regex: string;
    regexFlags?: string;
}

/**
 * The main class to provide counter functionality.
 */
export class WordCounter {

    /** 中文字数 */
    private _nChineseChars: number = 0;
    /** 非 ASCII 字符数 */
    private _nASCIIChars: number = 0;
    /** 英文单词数 */
    private _nEnglishWords: number = 0;
    /** 非空白字符数 */
    private _nWhitespaceChars: number = 0;
    /** 总字符数 */
    private _nTotalChars: number = 0;
    /** 格式化函数 */
    private _replaceFuncs: { [key: string]: Function }

    private _regexWordChar!: RegExp;
    private _regexASCIIChar!: RegExp;
    private _regexWhitespaceChar!: RegExp;
    private _customVarsNames!: string[];
    private _customVarsRegexMap!: Map<string, RegExp>;
    private _customVarsNumMap!: Map<string, number>;
    private readonly _regexFormatReplace: RegExp;

    constructor(configuration: WorkspaceConfiguration) {
        this._regexFormatReplace = /\$\{([^}]+)\}/g;
        this._replaceFuncs = {};
        this.getConfig(configuration)
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("wordcount_cjk")) {
                console.log("wordcount_cjk changed");
                const configuration = workspace.getConfiguration(
                    "wordcount_cjk"
                );
                this.getConfig(configuration);
                // this.update(true);
            }
        }, this);
    }
    private getConfig(configuration: WorkspaceConfiguration) {
        this._regexWordChar = new RegExp(configuration.get<string>("regexWordChar", "\\w"));
        this._regexASCIIChar = new RegExp(configuration.get<string>("regexASCIIChar", "[\\u0000-\\u00FF]"));
        this._regexWhitespaceChar = new RegExp(configuration.get<string>("regexWhitespaceChar", "\\s"));
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

    private _customVarsCount(text: string, varName: string) {
        let num = 0;
        const regexp = this._customVarsRegexMap.get(varName);
        if (regexp === undefined)
            return;
        let result;
        while ((result = regexp.exec(text)) !== null) {
            num++;
        }
        this._customVarsNumMap.set(varName, num);
    }

    public count(text: string) {
        this._resetCounters();

        let inWord = false;
        for (let index = 0; index < text.length; ++index) {
            // Get a char
            const ch = text.charAt(index);

            this._countChineseChar(ch);
            this._countASCIIChar(ch);
            inWord = this._countEnglishWord(ch, inWord);
            this._countWhitespaceChar(ch);
        }
        this._countEnglishWord(' ', inWord);

        this._nTotalChars = text.length;
        this._customVarsRegexMap.forEach((regexp, key) => {
            this._customVarsCount(text, key);
        });
        for (const item of this._customVarsNumMap) {
            console.log(`${item[0]}: ${item[1]}`);
        }
        console.log(countRawWords(text));
    }

    public format(fmt: string): string {
        const _this = this;
        const cjk = this._nChineseChars;
        const ascii = this._nASCIIChars;
        const whitespace = this._nWhitespaceChars;
        const en_words = this._nEnglishWords;
        const total = this._nTotalChars;

        return fmt.replace(this._regexFormatReplace, (matches, expr) => {
            if (!_this._replaceFuncs[matches]) {
                _this._replaceFuncs[matches] = _this._compileExpiession(expr);
            }

            const f = _this._replaceFuncs[matches];
            const customVars = new Array();
            for (const item of this._customVarsNumMap) {
                customVars.push(item[1]);
            }
            return f(cjk, ascii, whitespace, en_words, total, ...customVars);
        });
    }

    private _compileExpiession(expr: string) {
        // this._customVarsNumMap;
        const f = new Function('cjk', 'ascii', 'whitespace', 'en_words', 'total', ...this._customVarsNames, `return ${expr};`);

        try {
            const customVars = new Array();
            for (const item of this._customVarsNames) {
                customVars.push(0);
            }
            f(0, 0, 0, 0, 0, ...customVars);
        } catch (e) {
            return new Function('cjk', 'ascii', 'whitespace', 'en_words', 'total', ...this._customVarsNames, `return '无效表达式: ${expr}';`);
        }

        return f;
    }

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
     *
     * @param ch char to be tested.
     */
    private _countASCIIChar(ch: string) {
        if (this._regexASCIIChar.test(ch)) {
            this._nASCIIChars += 1;
        }
    }

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
     *
     * @param ch Char to be tested.
     */
    private _countChineseChar(ch: string) {
        // Count chinese Chars
        const regexChineseChar = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
        if (regexChineseChar.test(ch)) {
            this._nChineseChars += 1;
        }
    }

    /**
     * Test if a char is a word character.
     *
     * The regular expression \w rule is used.
     * In Javascript it matches any alphanumeric character including the underscore.
     * Equivalent to [A-Za-z0-9_].
     *
     * @todo the word means should be configurable.
     *
     * @param ch Char to be tested
     */
    private _countEnglishWord(ch: string, inWord: boolean): boolean {
        if (this._regexWordChar.test(ch)) {
            return true;
        } else {
            if (inWord) {
                this._nEnglishWords += 1;
            }
            return false;
        }
    }

    /**
     * Test if a char is a white space.
     *
     * The regular expression \s rule is used.
     * In Javascript it matches a single white space character, including space,
     * tab, form feed, line feed.
     * Equivalent to [ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]
     *
     * @param ch Char to be tested.
     */
    private _countWhitespaceChar(ch: string) {
        if (this._regexWhitespaceChar.test(ch)) {
            this._nWhitespaceChars += 1;
        }
    }

    private _resetCounters() {
        this._nChineseChars = 0;
        this._nASCIIChars = 0;
        this._nEnglishWords = 0;
        this._nWhitespaceChars = 0;
        this._nTotalChars = 0;
    }
}
