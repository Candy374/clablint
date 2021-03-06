/**
 * @author linhuiw
 * @desc 更新文件
 */

import * as vscode from "vscode";
import { TargetStr } from "./define";
import { updateLangFiles } from "./file";
/**
 * 更新文件
 * @param target  目标字符串对象
 * @param val  目标 key
 * @param validateDuplicate 是否校验文件中已经存在要写入的 key
 */
export function replaceAndUpdate(
  target: TargetStr,
  val: string,
  validateDuplicate: boolean
): Thenable<any> {
  const edit = new vscode.WorkspaceEdit();
  const { document } = vscode.window.activeTextEditor!;
  let finalReplaceText = target.text;
  // 若是字符串，删掉两侧的引号
  if (target.isString) {
    // 如果引号左侧是 等号，则可能是 jsx 的 props，此时要替换成 {
    let startColPosition;
    try {
      startColPosition = target.range.start.translate(0, -2);
    } catch (e) {
      startColPosition = target.range.start.translate(0, 0);
    }
    const prevTextRange = new vscode.Range(
      startColPosition,
      target.range.start
    );
    const [last2Char, last1Char] = document.getText(prevTextRange).split("");
    let finalReplaceVal = `translate(${val})`;
    if (last2Char === "=") {
      finalReplaceVal = `{${finalReplaceVal}}`;
    } else if (last1Char === "`") {
      // 若是模板字符串，看看其中是否包含变量
      const varInStr = target.text.match(/(\$\{[^\}]+?\})/g);
      if (varInStr) {
        const kvPair = varInStr.map((str, index) => {
          return `val${index + 1}: ${str.replace(/^\${([^\}]+)\}$/, "$1")}`;
        });
        finalReplaceVal = `translate(${val}, { ${kvPair.join(",\n")} })`;

        varInStr.forEach((str, index) => {
          finalReplaceText = finalReplaceText.replace(str, `{val${index + 1}}`);
        });
      }
    }

    edit.replace(
      document.uri,
      target.range.with({
        start: target.range.start.translate(0, -1),
        end: target.range.end.translate(0, 1),
      }),
      finalReplaceVal
    );
  } else {
    edit.replace(document.uri, target.range, `{translate(${val})}`);
    // edit.replace(document.uri, arg.range, "{" + val + "}");
  }

  // 更新语言文件
  updateLangFiles(val, finalReplaceText, validateDuplicate);

  // 若更新成功再替换代码
  return vscode.workspace.applyEdit(edit);
}

export function addImportString() {
  const edit = new vscode.WorkspaceEdit();
  const { document } = vscode.window.activeTextEditor!;
  const importI18nStr = `import { I18n } from 'i18n/dev';\n`;
  const importTranslateStr = `import { translate } from 'i18n/translate';\n`;

  const content = document.getText();

  if (!content.includes(importI18nStr)) {
    edit.insert(document.uri, new vscode.Position(0, 0), importI18nStr);
  }

  if (!content.includes(importTranslateStr)) {
    edit.insert(document.uri, new vscode.Position(0, 0), importTranslateStr);
  }
  vscode.workspace.applyEdit(edit);
}
