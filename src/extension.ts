// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { triggerUpdateDecorations } from "./chineseCharDecorations";
import { TargetStr } from "./define";
import { findAllI18N } from "./findAllI18N";
import { getSuggestLangObj } from "./getLangData";
import { replaceAndUpdate } from "./replaceAndUpdate";
import { findMatchKey, getConfiguration, translateText } from "./utils";
import * as randomstring from "randomstring";
import _ = require("lodash");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("clab-lint.findAllI18N", findAllI18N)
  );
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "clab-lint" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "clab-lint.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from clab-lint!");
    }
  );

  context.subscriptions.push(disposable);

  let targetStringList: TargetStr[] = [];
  let finalLangObj: { [key: string]: any } = {};

  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdateDecorations((newTargetStringList) => {
      targetStringList = newTargetStringList;
    });
  }

  // 识别到出错时点击小灯泡弹出的操作
  // TODO: get setting
  const hasLightBulb = getConfiguration("enableReplaceSuggestion") || true;
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
              finalLangObj = getSuggestLangObj();
              for (const key in finalLangObj) {
                if (finalLangObj[key] === text) {
                  actions.push({
                    title: `抽取为 \`I18N.${key}\``,
                    command: "clab-lint.extractI18N",
                    arguments: [
                      {
                        targets: sameTextStringList,
                        varName: `I18N.${key}`,
                      },
                    ],
                  });
                }
              }

              return actions.concat({
                title: `抽取为自定义 I18N 变量（共${sameTextStringList.length}处）`,
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

  const currentFilename = activeEditor!.document.fileName;
  const suggestPageRegex = /\/pages\/\w+\/([^\/]+)\/([^\/\.]+)/;
  let suggestion: RegExpMatchArray | null = [];
  if (currentFilename.includes("/pages/")) {
    suggestion = currentFilename.match(suggestPageRegex);
    if (suggestion) {
      suggestion.shift();
    }
  }

  /** 如果没有匹配到 Key */
  if (!(suggestion && suggestion.length)) {
    const names = currentFilename.split("/") as string[];
    const fileName = names[names.length - 2];
    const fileKey = fileName.split(".")[0].replace(new RegExp("-", "g"), "_");
    const dir = names[names.length - 2].replace(new RegExp("-", "g"), "_");
    if (dir === fileKey) {
      suggestion = [dir];
    } else {
      suggestion = [dir, fileKey];
    }
  }
  // 点击小灯泡后进行替换操作
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-i18n-linter.extractI18N",
      (args) => {
        return new Promise((resolve) => {
          // 若变量名已确定则直接开始替换
          if (args.varName) {
            return resolve(args.varName);
          }
          // 否则要求用户输入变量名
          return resolve(
            vscode.window.showInputBox({
              prompt:
                "请输入变量名，格式 `I18N.[page].[key]`，按 <回车> 启动替换",
              value: `I18N.${
                suggestion?.length ? suggestion.join(".") + "." : ""
              }`,
              validateInput(input) {
                if (!input.match(/^I18N\.\w+\.\w+/)) {
                  return "变量名格式 `I18N.[page].[key]`，如 `I18N.dim.new`，[key] 中可包含更多 `.`";
                }
              },
            })
          );
        }).then((val: any) => {
          // 没有输入变量名
          if (!val) {
            return;
          }
          const finalArgs = Array.isArray(args.targets)
            ? args.targets
            : [args.targets];
          return finalArgs
            .reverse()
            .reduce((prev: Promise<any>, curr: TargetStr, index: number) => {
              return prev.then(() => {
                const isEditCommon = val.startsWith("I18N.common.");
                return replaceAndUpdate(
                  curr,
                  val,
                  !isEditCommon && index === 0 ? !args.varName : false
                );
              });
            }, Promise.resolve())
            .then(
              () => {
                vscode.window.showInformationMessage(
                  `成功替换 ${finalArgs.length} 处文案`
                );
              },
              (err: any) => {
                console.log(err, "err");
              }
            );
        });
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
      }
    }, null)
  );

  // 当 文档发生变化时 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations((newTargetStringList) => {
          targetStringList = newTargetStringList;
        });
      }
    }, null)
  );

  const virtualMemory: { [key: string]: any } = {};
  // 一键替换所有中文
  context.subscriptions.push(
    vscode.commands.registerCommand("clab-lint.start", () => {
      if (targetStringList.length === 0) {
        vscode.window.showInformationMessage("没有找到可替换的文案");
        return;
      }

      vscode.window
        .showInformationMessage(
          `共找到 ${targetStringList.length} 处可自动替换的文案，是否替换？`,
          { modal: true },
          "Yes"
        )
        .then((action) => {
          if (action === "Yes") {
            // 翻译中文文案
            const translatePromises = targetStringList.reduce((prev, curr) => {
              // 避免翻译的字符里包含数字或者特殊字符等情况
              const reg = /[^a-zA-Z\x00-\xff]+/g;
              const findText = curr.text.match(reg);
              const transText = findText?.join("").slice(0, 4);
              return prev.concat(translateText(transText));
            }, [] as any[]);

            Promise.all(translatePromises).then(([...translateTexts]) => {
              const replaceableStrs = targetStringList.reduce(
                (prev, curr, i) => {
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
                      length: 4,
                      charset:
                        "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM",
                    })}`;
                    const transText = translateTexts[i]
                      ? _.camelCase(translateTexts[i])
                      : uuidKey;
                    let transKey = `${
                      suggestion?.length ? suggestion.join(".") + "." : ""
                    }${transText}`;
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
                },
                [] as any[]
              );

              replaceableStrs
                .reverse()
                .reduce((prev: Promise<any>, obj) => {
                  return prev.then(() => {
                    return replaceAndUpdate(
                      obj.target,
                      `I18N.${obj.key}`,
                      false
                    );
                  });
                }, Promise.resolve())
                .then(() => {
                  vscode.window.showInformationMessage("替换完成");
                })
                .catch((e) => {
                  vscode.window.showErrorMessage(e.message);
                });
            });
          }
        });
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
