/**
 * @author linhuiw
 * @desc 获取语言文件
 */
import * as fs from "fs";
import * as vscode from "vscode";
import { getCommonTranslateFile, getCurrentTranslateFile } from "./file";
import { getLangJson } from "./utils";
import * as ts from "typescript";
/**
 * 获取对应文件的语言
 */
export function getLangData(fileName: string) {
  if (fs.existsSync(fileName)) {
    return getLangJson(fileName);
  } else {
    return {};
  }
}

export function getFolderArr(filePath: string) {
  const pathPart = filePath.split("/");
  pathPart.pop();

  return pathPart.slice(0, 2);
}

export function getI18N() {
  // 获取当前entity 和common 的 key value
  const currentFilename = vscode.window.activeTextEditor!.document.uri.path;
  const [filePrefix, filePath] = currentFilename.split("/src/");

  const filePathPrefix = getFolderArr(filePath).join("/");
  const fileName = getCurrentTranslateFile(filePathPrefix);
  const prefixList = getFolderArr(filePath);

  const currentFileMap = getFlattenMap(getLangData(fileName), prefixList);
  const commonFileMap = getFlattenMap(getLangData(getCommonTranslateFile()), [
    "common",
  ]);

  return {
    i18n: {
      ...currentFileMap,
      ...commonFileMap,
    },
    fileName,
  };
}
/**
 * 获取全部语言, 展平
 */

type TranslateMap = { [key: string]: TranslateMap | string };

function getFlattenMap(meta: TranslateMap, prefixList: string[]) {
  const flattenMap: { [key: string]: string } = {};

  function dfs(meta: TranslateMap | string, parentIds: string[]) {
    if (typeof meta === "string") {
      const flattenKey = prefixList.concat(parentIds).join(".");
      flattenMap[flattenKey] = meta;
      return;
    }

    for (const [key, child] of Object.entries(meta)) {
      dfs(child, parentIds.concat(key));
    }
  }

  dfs(meta, []);

  return flattenMap;
}
