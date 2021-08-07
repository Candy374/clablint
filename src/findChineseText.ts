/**
 * @author linhuiw
 * @desc 利用 Ast 查找对应文件中的中文文案
 */
import * as ts from "typescript";
import * as vscode from "vscode";

import { DOUBLE_BYTE_REGEX } from "./const";
import { trimWhiteSpace } from "./parserUtils";
import { removeFileComment } from "./astUtils";

/**
 * 查找 Ts 文件中的中文
 * @param code
 */

function findTextInTs(code: string, fileName: string) {
  const matches: { range: vscode.Range; text: string; isString: boolean }[] =
    [];
  const activeEditor = vscode.window.activeTextEditor!;
  const ast = ts.createSourceFile(
    "",
    code,
    ts.ScriptTarget.ES2015,
    true,
    ts.ScriptKind.TSX
  );

  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node as ts.StringLiteral;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除引号 */
          const startPos = activeEditor.document.positionAt(start + 1);
          const endPos = activeEditor.document.positionAt(end - 1);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text,
            isString: true,
          });
        }
        break;
      }
      case ts.SyntaxKind.JsxElement:
      case ts.SyntaxKind.JsxFragment: {
        const { children } = node as ts.JsxElement;

        children.forEach((child) => {
          if (child.kind === ts.SyntaxKind.JsxText) {
            const text = child.getText();
            /** 修复注释含有中文的情况，Angular 文件错误的 Ast 情况 */
            const noCommentText = removeFileComment(text, fileName);

            if (noCommentText.match(DOUBLE_BYTE_REGEX)) {
              const start = child.getStart();
              const end = child.getEnd();
              const startPos = activeEditor.document.positionAt(start);
              const endPos = activeEditor.document.positionAt(end);
              const { trimStart, trimEnd } = trimWhiteSpace(
                code,
                startPos,
                endPos
              );
              const range = new vscode.Range(trimStart, trimEnd);

              matches.push({
                range,
                text: text.trim(),
                isString: false,
              });
            }
          }
        });
        break;
      }
      case ts.SyntaxKind.TemplateExpression: {
        const { pos, end } = node;
        let templateContent = code.slice(pos, end);
        templateContent = templateContent
          .toString()
          .replace(/\$\{[^\}]+\}/, "");
        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除`号 */
          const startPos = activeEditor.document.positionAt(start + 1);
          const endPos = activeEditor.document.positionAt(end - 1);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text: code.slice(start + 1, end - 1),
            isString: true,
          });
        }
        break;
      }
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        const { pos, end } = node;
        let templateContent = code.slice(pos, end);
        templateContent = templateContent
          .toString()
          .replace(/\$\{[^\}]+\}/, "");
        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除`号 */
          const startPos = activeEditor.document.positionAt(start + 1);
          const endPos = activeEditor.document.positionAt(end - 1);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text: code.slice(start + 1, end - 1),
            isString: true,
          });
        }
      case ts.SyntaxKind.JsxFragment: {
      }
      case ts.SyntaxKind.JsxText: {
      }
    }

    ts.forEachChild(node, visit);
  }
  ts.forEachChild(ast, visit);

  return matches;
}

export function findChineseText(code: string, fileName: string) {
  return findTextInTs(code, fileName);
}
