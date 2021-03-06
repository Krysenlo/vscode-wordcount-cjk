# vscode-wordcount-cjk

> **This is just a fork of [Word Count CJK](https://marketplace.visualstudio.com/items?itemName=holmescn.vscode-wordcount-cjk)**  
> Just for test "publish it to the VS Code Extension Marketplace"
> and for my own use.
> 
> add some features:
> 1. use string array in configure of `wordcount_cjk.statusBarTooltipTemplate`: 
> ```
> "wordcount_cjk.statusBarTooltipTemplate": [
>   "Line 1",
>   "Line 2",
>   "Line 3",
> ],
> ```
> 2. Add some escaped-text for `wordcount_cjk.statusBarTooltipTemplate`
>   because Text-alignment in tooltip on windows is wrong  
>   This fix is **ONLY for Windows** with default system font is `Microsoft Yahei UI`
>    - `\\ap`: alignment point. Use this to split line, Make sure that each piece is the same length.
>    - `\\l`: loose. Spaces of variable length. Use with `\\ap` to achieve left/right alignment;
>       ```
>       "wordcount_cjk.statusBarTooltipTemplate": [
>         "|左对齐AA\\l|\\ap|左对齐AA\\l|",
>         "|\\l右对齐BBB|\\ap|\\l右对齐BBB|",
>         "|左对齐C\\l|\\ap|左对齐C\\l|",
>         "|\\l右对齐D|\\ap|\\l右对齐D|",
>         "|左对齐EEE\\l|\\ap|左对齐EEE\\l|"
>       ],
>       ```
>       will show like this:   
>       ![a](doc/img/Tooltip-alignment.png)
> 3. Add customVars that can be used in `wordcount_cjk.statusBarTextTemplate` and `wordcount_cjk.statusBarTooltipTemplate`
>  ```
>  "wordcount_cjk.customVars": [
>    {
>      "name": "中文字数",
>      "regex": "[\\u4E00-\\u9FA5\\uF900-\\uFA2D]"
>    },
>    {
>      "name": "英文单词数",
>      "regex": "[a-zA-Z_]+"
>    },
>    {
>      "name": "ascii",
>      "regex": "[\\u0000-\\u00FF]"
>    },
>    {
>      "name": "空白",
>      "regex": "\\s"
>    },
>    {
>      "name": "常用标点符号",
>      "regex": "[，。；“”‘’：,.;\"']"
>    },
>    {
>      "name": "非中文非ASCII",
>      "regex": "[^\\u0000-\\u00FF\\u4E00-\\u9FA5\\uF900-\\uFA2D]"
>    },
>    {
>      "name": "空行",
>      "regex": "\\n(?=\\r?\\n)"
>    }
>  ]
>  ```
> 4. Add debug mode configuration `"wordcount_cjk.debug": true,`. If you enable it, you will see all the results calculated from `wordcount_cjk.customVars` in the "Output" panel.
> 


This is a more powerful word count extension for VSCode, which supports the CJK character counting.

## Features

In current version, the following things are counted:

1. Total characters in a document.
2. Non-whitespace characters.
3. English words.
4. Non-ASCII characters.
5. CJK characters.

In current version, the following format is supported:

1. Markdown file.
2. Plain text file.

For other files that are not supported, such as ReStructuredText, a command `Word Count` is offered. The command only calculate once. For keep tracking the word count, you can use the `Word Count Activate` command, and the `Word Count Deactivate` to stop tracking.

A status bar item is added, and full statistics are added as a tooltip of the status bar item.

In current version, all CJK characters are counted as Chinese characters. Since I have little knowledge of
Japanese and Korean, I don't know how to count them. If someone knows, please
tell me in an issue.

## Extension Settings

* `wordcount_cjk.statusBarTextTemplate`: Customize the status bar item text.
* `wordcount_cjk.statusBarTooltipTemplate`: Customize the status bar item tooltip.
* `wordcount_cjk.regexWordChar`: The regular expression used to test if a char is a word char.
* `wordcount_cjk.regexASCIIChar`: The regular expression used to test if a char is a ASCII char.
* `wordcount_cjk.regexWhitespaceChar`: The regular expression used to test if a char is a whitespace.
* `wordcount_cjk.activateLanguages`: The languages that activate the extension.

in `wordcount_cjk.statusBarTextTemplate` and `wordcount_cjk.statusBarTooltipTemplate`, the following placeholder could be used:

1. `cjk`: The number of CJK characters.
2. `ascii`: The number of ASCII characters.
3. `whitespace`: The number of whitespace characters.
4. `en_words`: The number of english words.
5. `total`: The total number of characters.

Since version 1.1, calculation could be done in format string, so one can do this: `${total - cjk} chars`. The expression should
be a valid JavaScript expresion.

### Word char

In default settings, word char is tested by regular expression `\w`, which is equivalent to `[A-Za-z0-9_]`.

### ASCII char

In default settings, word char is tested by regular expression `[\u0000-\u00FF]`, which contains:

1. `0000-007F`: C0 Controls and Basic Latin (ASCII)
2. `0080-00FF`: C1 Controls and Latin-1 Supplement (Extended ASCII)

Perhaps someone want to limit the counter with basic ASCII, then config the `wordcount_cjk.regexASCIIChar` to
`[\u0000-\u007F]`.

### Whitespace char

In default settings, word char is tested by regular expression `\s`, which is equivalent to
`[ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]`. That means
unicode whitespace is also counted. If you don't what that, change the regular expression
`wordcount_cjk.regexWhitespaceChar`.

### CJK char

**NOTE**: This is not configurable.

The built-in regular expression is `[\u4E00-\u9FA5\uF900-\uFA2D]`, which contains:

* 4E00-9FFF: CJK Unified Ideographs
* F900-FAFF: CJK Compatibility Ideographs

if someone other than Chinese use this extension, I will try to seperate the Chinese,
Japanese and Korean characters counters. For now, they are mixed.

## TODO

1. None

If you have any requested feature, open an issue!

**Enjoy!**
