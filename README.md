# Convertlab lint

Convertlab 的 `VS Code`插件工具，主要用于检测代码中的中文，高亮出中文字符串，并一键提取中文字符串。

同时优化开发体验，在 `VS Code` 中提供搜索中文，提示国际化值对应的中文功能。

## 如何使用

![演示](https://img.alicdn.com/tfs/TB1EYENfTnI8KJjy0FfXXcdoVXa-1006-368.gif)

![展示](https://img.alicdn.com/tfs/TB1pzAIC4YaK1RjSZFnXXa80pXa-884-308.png)

## 配置项

### clab-lint.markStringLiterals

default: `true`

是否标红中文字符串，默认开启。

### clab-lint.showOverviewRuler

default: `true`

右侧滚动条中，是否显示对应的待提取中文高亮。

![](https://img.alicdn.com/tfs/TB1CHZRrxGYBuNjy0FnXXX5lpXa-1088-568.png)

### clab-lint.markColor

default: `#ff4400`

待提取文字，高亮颜色。

### clab-lint.enableReplaceSuggestion

default: `true`

是否开启一键提取中文功能。
