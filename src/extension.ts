// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { triggerUpdateDecorations } from "./chineseCharDecorations";
import { TargetStr } from "./define";

import { getI18N } from "./getLangData";
import { addImportString, replaceAndUpdate } from "./replaceAndUpdate";
import { findMatchKey, getConfiguration } from "./utils";
import * as randomstring from "randomstring";
import _ = require("lodash");
import { clearCacheByFilename } from "./findI18NPositions";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // context.subscriptions.push(
  //   vscode.commands.registerCommand("clab-lint.findAllI18N", findAllI18N)
  // );

  let targetStringList: TargetStr[] = [];
  let finalLangObj: { [key: string]: any } = {};

  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdateDecorations((newTargetStringList) => {
      targetStringList = newTargetStringList;
    });
  }

  // 识别到出错时点击小灯泡弹出的操作

  const hasLightBulb = getConfiguration("enableReplaceSuggestion");
  if (hasLightBulb) {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        [
          { scheme: "file", language: "typescriptreact" },
          { scheme: "file", language: "typescript" },
          { scheme: "file", language: "javascriptreact" },
          { scheme: "file", language: "javascript" },
        ],
        {
          provideCodeActions: function (document, range, context, token) {
            const targetStr = targetStringList.find((t) => {
              if (range.intersection(t.range) !== undefined) {
                return true;
              }
            });
            if (targetStr) {
              const sameTextStringList = targetStringList.filter(
                (t) => t.text === targetStr.text
              );
              const text = targetStr.text;
              const actions: {
                title: string;
                command: string;
                arguments: any[];
              }[] = [];
              const { i18n } = getI18N();
              finalLangObj = i18n;
              for (const key of Object.keys(finalLangObj)) {
                if (finalLangObj[key] === text) {
                  actions.push({
                    title: `抽取为 \`I18n.${key}\``,
                    command: "clab-lint.extractI18N",
                    arguments: [
                      {
                        targets: sameTextStringList,
                        varName: `I18n.${key}`,
                      },
                    ],
                  });
                }
              }

              return actions.concat({
                title: `抽取为自定义 I18n 变量（共${sameTextStringList.length}处）`,
                command: "clab-lint.extractI18N",
                arguments: [
                  {
                    targets: sameTextStringList,
                  },
                ],
              });
            }
          },
        }
      )
    );
  }

  let suggestionPath = "";
  function setSuggestionPath() {
    const currentFilename = activeEditor!.document.fileName;

    if (currentFilename.includes("/src/")) {
      suggestionPath = currentFilename
        .split("/src/")
        .pop()!
        .replace(/\//g, ".")
        .replace(/\.[^.]+$/, ".");
    } else {
      suggestionPath = "";
    }
  }

  setSuggestionPath();

  // 点击小灯泡后进行替换操作
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "clab-lint.extractI18N",
      async ({ varName, targets }) => {
        let val;
        if (varName) {
          val = varName;
        } else {
          val = await vscode.window.showInputBox({
            prompt:
              "请输入变量名，格式 `I18n.[folder].[entity]`，按 <回车> 启动替换",
            value: `I18n.${suggestionPath}`,
            validateInput(input) {
              if (!input.match(/^I18n\.\w+(\.\w+)+$/)) {
                return "变量名格式 `I18n.[folder].[entity]`，如 `I18n.domains.trait_manage`，[key] 中可包含更多 `.`";
              } else {
                for (const part of input.split(".")) {
                  if (/^\d.*/.test(part)) {
                    return "[folder]、[entity]或者key 不能以数字开头";
                  }
                }
              }
            },
          });
        }

        // 没有输入变量名
        if (!val) {
          return;
        }

        try {
          const finalArgs = Array.isArray(targets) ? targets : [targets];
          finalArgs.sort((t1: TargetStr, t2: TargetStr) => {
            return sortTranslateList(t1.range, t2.range);
          });

          let needCheckDup = !varName;
          let checked = false;
          for (const curr of finalArgs) {
            await replaceAndUpdate(curr, val, needCheckDup && !checked);
            if (needCheckDup) {
              checked = true;
            }
          }

          addImportString();
          vscode.window.showInformationMessage(
            `成功替换 ${finalArgs.length} 处文案`
          );
        } catch (err) {
          console.log(err, "err");
        }
      }
    )
  );
  // 当 切换文档 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations((newTargetStringList) => {
          targetStringList = newTargetStringList;
        });
        setSuggestionPath();
      }
    }, null)
  );

  // 当 文档发生变化时 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        const currentFilename = activeEditor.document.fileName;
        // 如果当前文件是翻译文件， 清除缓存
        if (currentFilename.includes("/i18n/")) {
          clearCacheByFilename(currentFilename);
          return;
        }

        triggerUpdateDecorations((newTargetStringList) => {
          targetStringList = newTargetStringList;
        });
      }
    }, null)
  );

  const virtualMemory: { [key: string]: any } = {};
  // 一键替换所有中文
  context.subscriptions.push(
    vscode.commands.registerCommand("clab-lint.start", async () => {
      if (targetStringList.length === 0) {
        vscode.window.showInformationMessage("没有找到可替换的文案");
        return;
      }

      const action = await vscode.window.showInformationMessage(
        `共找到 ${targetStringList.length} 处可自动替换的文案，是否替换？`,
        { modal: true },
        "Yes"
      );

      if (action !== "Yes") {
        return;
      }

      // // 翻译中文文案
      // const translatePromises = targetStringList.reduce((prev, curr) => {
      //   // 避免翻译的字符里包含数字或者特殊字符等情况
      //   const reg = DOUBLE_BYTE_REGEX;
      //   const findText = curr.text.match(reg);
      //   const transText = findText?.join("").slice(0, 4);
      //   return prev.concat(translateText(transText));
      // }, [] as any[]);

      const translateTexts: string[] = [];
      // Promise.all(translatePromises).then(([...translateTexts]) => {
      const replaceableList = targetStringList.reduce((prev, curr, i) => {
        const key = findMatchKey(finalLangObj, curr.text);
        if (!virtualMemory[curr.text]) {
          if (key) {
            virtualMemory[curr.text] = key;
            return prev.concat({
              target: curr,
              key,
            });
          }
          const uuidKey = `${randomstring.generate({
            length: 8,
            charset: "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM",
          })}`;
          const transText = translateTexts[i]
            ? _.camelCase(translateTexts[i])
            : uuidKey;
          let transKey = `${suggestionPath}${transText}`;
          let occurTime = 1;
          // 防止出现前四位相同但是整体文案不同的情况
          while (
            finalLangObj[transKey] !== curr.text &&
            _.keys(finalLangObj).includes(
              `${transKey}${occurTime >= 2 ? occurTime : ""}`
            )
          ) {
            occurTime++;
          }
          if (occurTime >= 2) {
            transKey = `${transKey}${occurTime}`;
          }
          virtualMemory[curr.text] = transKey;
          finalLangObj[transKey] = curr.text;
          return prev.concat({
            target: curr,
            key: transKey,
          });
        } else {
          return prev.concat({
            target: curr,
            key: virtualMemory[curr.text],
          });
        }
      }, [] as { key: string; target: TargetStr }[]);

      try {
        replaceableList.sort(
          (
            { target: t1 }: { target: TargetStr },
            { target: t2 }: { target: TargetStr }
          ) => {
            return sortTranslateList(t1.range, t2.range);
          }
        );

        for (const { key, target } of replaceableList) {
          await replaceAndUpdate(target, `I18n.${key}`, false);
        }

        addImportString();
        vscode.window.showInformationMessage(
          "替换完成, 修改了${replaceableList.length}个字符串"
        );
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

function sortTranslateList(r1: vscode.Range, r2: vscode.Range) {
  if (r1.start.line === r2.start.line) {
    return r2.start.character - r1.start.character;
  } else {
    return r2.start.line - r1.start.line;
  }
}

// TODO: 一键翻译全部文件
// TODO: 支持一个翻译软件， 生成有意义的key
// TODO: 在代码中增加eslint， 限制提交文件中的中文
// TODO: 增加  ignore 标志 允许忽略翻译
