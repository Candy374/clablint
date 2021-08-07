/**
 * @author linhuiw
 * @desc 查找代码中的中文, 并标记
 */
import * as vscode from "vscode";
import { setLineDecorations } from "./lineAnnotation";
import { findChineseText } from "./findChineseText";
// import * as minimatch from "minimatch";
import { getConfiguration } from "./utils";

/**
 * 中文的标记，红框样式
 */
function getChineseCharDecoration() {
  // 配置提示框样式
  const hasOverviewRuler = getConfiguration("showOverviewRuler");
  const shouldMark = getConfiguration("markStringLiterals");
  const color = getConfiguration("markColor");
  return vscode.window.createTextEditorDecorationType({
    borderWidth: shouldMark ? "1px" : undefined,
    borderStyle: shouldMark ? "dotted" : undefined,
    overviewRulerColor: hasOverviewRuler ? color : undefined,
    overviewRulerLane: hasOverviewRuler
      ? vscode.OverviewRulerLane.Right
      : undefined,
    light: {
      borderColor: shouldMark ? color : undefined,
    },
    dark: {
      borderColor: shouldMark ? color : undefined,
    },
  });
}

let timeout: NodeJS.Timeout | null = null;
let prevChineseCharDecoration: vscode.TextEditorDecorationType | null = null;
export function triggerUpdateDecorations(
  callback: (targetStringList: any[]) => void
) {
  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(() => {
    const activeEditor = vscode.window.activeTextEditor!;
    if (prevChineseCharDecoration) {
      /** 清除原有的提示 */
      activeEditor.setDecorations(prevChineseCharDecoration, []);
    }

    const result = updateDecorations();
    if (result) {
      const { chineseCharDecoration, targetStringList } = result;
      prevChineseCharDecoration = chineseCharDecoration;
      callback(targetStringList);
    }
  }, 500);
}

/**
 * 更新标记
 */
export function updateDecorations() {
  const activeEditor = vscode.window.activeTextEditor!;
  const currentFilename = activeEditor.document.fileName;
  if (
    !activeEditor ||
    currentFilename.includes("/i18n/") ||
    currentFilename.match(/spec\.(tsx|ts)$/)
  ) {
    return;
  }

  const text = activeEditor.document.getText();
  // 清空上一次的保存结果
  let targetStringList = [];
  let chineseChars: any[] = [];

  targetStringList = findChineseText(text, currentFilename);
  targetStringList.map((match) => {
    const decoration = {
      range: match.range,
      hoverMessage: `检测到中文文案: ${match.text}`,
    };
    chineseChars.push(decoration);
  });

  const shouldMark = getConfiguration("markStringLiterals");
  if (shouldMark !== true) {
    return;
  }

  const chineseCharDecoration = getChineseCharDecoration();
  /** 设置 I18N 的提示 */
  setLineDecorations(activeEditor);
  /** 设置中文的提示 */
  activeEditor.setDecorations(chineseCharDecoration, chineseChars);

  return {
    targetStringList,
    chineseCharDecoration,
  };
}
