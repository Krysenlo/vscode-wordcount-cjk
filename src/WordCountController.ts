// Import the module and reference it with the alias vscode in your code below
import {
    window,
    StatusBarItem,
    StatusBarAlignment,
    Disposable,
    WorkspaceConfiguration,
    workspace,
} from "vscode";
import pixelWidth from "./string-pixel-width";
import { WordCounter } from "./WordCounter";

function fontWidth(str: string): number {
    return pixelWidth(str, { font: "Microsoft YaHei" });
}
/**
 * The controller of word count
 */
export class WordCountController {
    private _wordCounter: WordCounter;
    private _statusBarItem: StatusBarItem;
    private _disposable: Disposable;
    private _delayUpdateTimer: any;
    private _isActive: boolean;
    private _statusBarTextTemplate!: string;
    private _statusBarTooltipTemplate!: string;
    private _activateLanguages!: Array<string>;

    constructor(
        configuration: WorkspaceConfiguration,
        wordCounter: WordCounter
    ) {
        this._isActive = false;
        this._wordCounter = wordCounter;
        this.getConfig(configuration);
        this._statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Left
        );

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(
            this._onEvent,
            this,
            subscriptions
        );
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("wordcount_cjk")) {
                console.log("wordcount_cjk changed");
                const configuration = workspace.getConfiguration(
                    "wordcount_cjk"
                );
                this.getConfig(configuration);
                console.log(
                    `1 this._statusBarTextTemplate = ${this._statusBarTextTemplate}`
                );
                this.update(true);
            }
        }, this);

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
        this.alignMapCal();
    }

    private getConfig(configuration: WorkspaceConfiguration) {
        this._statusBarTextTemplate = configuration.get<string>(
            "statusBarTextTemplate",
            "共 ${cjk} 字"
        );
        this._statusBarTooltipTemplate = configuration
            .get<string>(
                "statusBarTooltipTemplate",
                "中文字数：\\l${cjk}\\ap\\n非 ASCII 字符数：\\l${total - ascii}\\ap\\n英文单词数：\\l${en_words}\\ap\\n非空白字符数：\\l${total - whitespace}\\ap\\n总字符数：\\l\\h${total}\\ap"
            )
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t");
        this._activateLanguages = configuration.get<Array<string>>(
            "activateLanguages",
            ["markdown", "plaintext"]
        );
    }

    public update(force: boolean = false) {
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;

        if (force || this.shouldActivate(doc.languageId) || this._isActive) {
            // Update word count.
            if (editor.selection.isEmpty) {
                let text = doc.getText();
                this._wordCounter.count(text);
            } else {
                const text = editor.document.getText(editor.selection);
                this._wordCounter.count(text);
            }

            // Update the status bar
            try {
                // console.log(
                //   `2 this._statusBarTextTemplate = ${this._statusBarTextTemplate}`
                // );
                this._statusBarItem.text = this._wordCounter.format(
                    this._statusBarTextTemplate
                );
                this._statusBarItem.tooltip = this.align(
                    this._wordCounter.format(this._statusBarTooltipTemplate)
                );
                this._statusBarItem.show();
            } catch (e) {
                window.showErrorMessage(
                    `Something is wrong when update status bar: ${e}`
                );
            }
        } else {
            this._statusBarItem.hide();
        }
    }
    alignMap: Map<number, Array<number>> = new Map<number, Array<number>>();
    alignMissingMap: Map<number, number> = new Map<number, number>();
    readonly spaceMap = new Map<string, number>([
        [" ", 13],
        [" ", 17],
        [" ", 20],
        [" ", 24],
        [" ", 25],
        [" ", 33],
        [" ", 50],
        [" ", 59],
    ]);
    spaceIdxMap: Array<number> = [];
    spaceIdx2StrMap: Array<string> = [];
    getSpace(pixel: number): string {
        // pixel= (37~199) + 100*N 可为精确值，
        pixel += 37;
        let str = "";
        if (pixel >= 237) {
            // [237, ∞]
            const num = Math.floor(pixel / 200);
            str += "　　".repeat(num);
            pixel -= 200 * num;
        } else if (pixel > 137) {
            // [137, 237)
            str += "　";
            pixel -= 100;
        } else {
            // [37, 137)
        }

        const spaceArg = this.alignMap.get(pixel);
        // if(this.alignMissingMap.has(pixel)){
        //   console.log(`diff ${this.alignMissingMap.get(pixel)} pix`)
        // }

        if (spaceArg) {
            for (let i = 0; i < spaceArg.length; i++) {
                const arg = spaceArg[i];
                str += this.spaceIdx2StrMap[i].repeat(arg);
            }
        }
        return str;
    }
    private alignMapCal() {
        let sum;
        for (const item of this.spaceMap) {
            this.spaceIdxMap.push(item[1]);
            this.spaceIdx2StrMap.push(item[0]);
        }
        function calNext(
            alignMap: Map<number, Array<number>>,
            spaceIdxMap: Array<number>,
            index: number,
            presum: number,
            coefficients: Array<number>
        ) {
            let width: number = spaceIdxMap[index];
            let cycle = index;
            const isLast: boolean = spaceIdxMap.length - 1 === index;

            for (let i = 0; i < 100 / width; i++) {
                sum = width * i + presum;
                const coeff = [...coefficients, i];
                // if (isLast) {
                //   if (sum > 100) {
                //     console.log(`${coeff}=${sum}`);
                //   } else {
                //     console.log(`${coeff}=${sum} =>`);
                //   }
                // } else {
                //   console.log(`${coeff}`);
                // }
                if (sum > 200) {
                    continue;
                }
                if (isLast) {
                    if (!alignMap.has(sum)) {
                        // console.log(`\t==>`);
                        alignMap.set(sum, coeff);
                    }
                }
                calNext(alignMap, spaceIdxMap, index + 1, sum, coeff);
            }
        }
        calNext(this.alignMap, this.spaceIdxMap, 0, 0, []);

        let prei = 0,
            nexti = 0,
            avri = 0;
        for (let i = 0; i < 200; i++) {
            if (nexti <= i) {
                for (let j = i + 1; j < 100; j++) {
                    if (this.alignMap.has(j)) {
                        nexti = j;
                        avri = (prei + nexti) / 2;
                        // console.log(`[${prei},${nexti}]`);
                        break;
                    }
                }
            }
            if (this.alignMap.has(i)) {
                // console.log(`${i}: ${this.alignMap.get(i)}`);
                prei = i;
                avri = (prei + nexti) / 2;
            } else {
                if (i < avri) {
                    this.alignMap.set(i, this.alignMap.get(prei)!);
                    // console.log(`missing ${i} => ${prei} [${prei},${nexti}]`);
                    this.alignMissingMap.set(i, i - prei);
                } else {
                    this.alignMap.set(i, this.alignMap.get(nexti)!);
                    // console.log(`missing ${i} => ${nexti} [${prei},${nexti}]`);
                    this.alignMissingMap.set(i, i - nexti);
                }
            }
        }
    }

    private align(str: string): string {
        let ret = "";
        let lines: string[] = str.split("\n");
        // console.log(lines);
        let linesSplits: string[][] = lines.map<string[]>((line) => {
            return line.split(/\\ap/);
        });
        // console.log(linesSplits);
        const maxSplitsNum = linesSplits.reduce<number>(
            (prev, cur, curId, array) => {
                if (cur.length > prev) return cur.length;
                else return prev;
            },
            0
        );
        var letter = String.fromCharCode(8202);
        const spaceLen = fontWidth(letter);

        const lineNum = lines.length;
        let outLines = new Array<string>();
        lines.forEach((v, i) => {
            outLines[i] = "";
        });
        // maxSplitsNum 列
        for (let i = 0; i < maxSplitsNum; i++) {
            // 对每一列对齐

            // 每一列最大长度
            const maxLen = linesSplits.reduce<number>(
                (prev, cur, curId, array) => {
                    if (i >= cur.length) return prev;
                    const str = cur[i].replace(/\\l/g, "");
                    const len = fontWidth(str);
                    // console.log(
                    //   `${i} ${curId} (${str.length} | ${len}/${spaceLen}=${
                    //     len / spaceLen
                    //   }): [${cur[i].replace(/\\l/, '')}]`
                    // );
                    if (len > prev) return len;
                    else return prev;
                },
                0
            );
            // console.log(maxLen);
            // for (const lineSplits of linesSplits) {
            linesSplits.forEach((lineSplits, index) => {
                const split = lineSplits[i];
                if (split === undefined) return;
                const length = fontWidth(
                    split.replace(/\\l/g, "").replace(/\\h/g, "")
                );
                const spaceNum = (maxLen - length) / spaceLen;
                const additionalSpaces = split.split(/\\h/).length - 1;
                let pieces = split.replace(/\\h/g, "").split("\\l");
                // console.log(
                //   `(${maxLen} - ${length})}):${
                //     maxLen - length
                //   } / ${spaceLen} = ${spaceNum}`
                // );
                outLines[index] +=
                    pieces.shift() +
                    // letter.repeat(Math.round(spaceNum) + additionalSpaces);
                    this.getSpace(maxLen - length);
                outLines[index] += pieces.join();
            });
        }
        ret = outLines.join("\n");
        // console.log(ret);
        return ret;
    }

    private shouldActivate(languageId: string): boolean {
        for (var l of this._activateLanguages) {
            if (l === languageId) {
                return true;
            }
        }

        return false;
    }

    private _onEvent() {
        this.update();

        if (this._delayUpdateTimer) {
            clearTimeout(this._delayUpdateTimer);
        }

        this._delayUpdateTimer = setTimeout(() => {
            this._delayUpdateTimer = null;
            this.update();
        }, 500);
    }

    /**
     * This makes the class disposable.
     */
    dispose() {
        this._statusBarItem.dispose();
        this._disposable.dispose();
    }

    activate() {
        this._isActive = true;
        this.update();
    }

    deactivate() {
        this._isActive = false;
        this._statusBarItem.hide();
    }
}
