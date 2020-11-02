# Change Log
All notable changes to the "wordcount-cjk" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.5.0] - 2020-11-02
### Enhancement
- Add customVars that can be used in `wordcount_cjk.statusBarTextTemplate` and `wordcount_cjk.statusBarTooltipTemplate`
  ```
  "wordcount_cjk.customVars": [
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
  ]
  ```

## [1.4.0] - 2020-10-28
### Enhancement
- Use string array in configure of `wordcount_cjk.statusBarTooltipTemplate`: 
```
"wordcount_cjk.statusBarTooltipTemplate": [
  "Line 1",
  "Line 2",
  "Line 3",
],
```
- Add some escaped-text for `wordcount_cjk.statusBarTooltipTemplate`
  because Text-alignment in tooltip on windows is wrong  
  This fix is **ONLY for Windows** with default system font is `Microsoft Yahei UI`
   - `\\ap`: alignment point. Use this to split line, Make sure that each piece is the same length.
   - `\\l`: loose. Spaces of variable length. Use with `\\ap` to achieve left/right alignment;
      ```
      "wordcount_cjk.statusBarTooltipTemplate": [
        "|左对齐AA\\l|\\ap|左对齐AA\\l|",
        "|\\l右对齐BBB|\\ap|\\l右对齐BBB|",
        "|左对齐C\\l|\\ap|左对齐C\\l|",
        "|\\l右对齐D|\\ap|\\l右对齐D|",
        "|左对齐EEE\\l|\\ap|左对齐EEE\\l|"
      ],
      ```
      will show like this:   
      ![a](doc/img/Tooltip-alignment.png)

## [1.2.0] - 2018-06-01
### Enhancement
- Add `activateLanguages` options.
- Add `Word Count Activate` and `Word Count Deactivate` command

### Remove
- Remove the activate method by `.editorconfig`.

## [1.1.0] - 2018-01-28
### Enhancement
- Format string supports calculation. [Issue #2](https://github.com/holmescn/vscode-wordcount-cjk/issues/2)

### Fix
- Add a timer to update count, which fix the first issue of delay count.

## [1.0.1] - 2018-01-22
### Added
- Add a new activate method through `.editorconfig`. [Issue #1](https://github.com/holmescn/vscode-wordcount-cjk/issues/1)

## [Unreleased]
- Initial release
