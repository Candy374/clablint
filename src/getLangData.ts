/**
 * @author linhuiw
 * @desc 获取语言文件
 */
import * as fs from "fs";
import * as globby from "globby";
import * as vscode from "vscode";
import { I18N_GLOB } from "./const";
import { flatten, getCurrentProjectLangPath, getLangJson } from "./utils";

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

function getFolderArr(filePath: string) {
  const pathPart = filePath.split("/");
  pathPart.pop();
  pathPart.pop();
  return pathPart.slice(0, 2);
}
export function getI18N() {
  const currentFilename = vscode.window.activeTextEditor!.document.uri.path;
  const [filePrefix, filePath] = currentFilename.split("/src/");

  const filePathPrefix = getFolderArr(filePath).join("/");
  const fileName = `${filePrefix}/src/${filePathPrefix}/i18n/index.ts`;

  const fileContent = getLangData(fileName);
  let jsObj = fileContent;

  return jsObj;
}
/**
 * 获取全部语言, 展平
 */
export function getSuggestLangObj() {
  const langObj = getI18N();
  const finalLangObj = flatten(langObj);
  return finalLangObj;
}

type TranslateMap = { [key: string]: TranslateMap | string };
export function getKeyByValueMap(meta: TranslateMap, value: string) {
  function dfs(
    meta: TranslateMap | string,
    parentIds: string[]
  ): string | undefined {
    if (typeof meta === "string") {
      const flattenKey = parentIds.join(".");
      if (meta === value) {
        return flattenKey;
      }

      return;
    }

    for (const [key, child] of Object.entries(meta)) {
      const flattenKey = dfs(child, parentIds.concat(key));
      if (flattenKey) {
        return flattenKey;
      }
    }
  }

  const key = dfs(meta, []);
  if (key) {
    const currentFilename = vscode.window.activeTextEditor!.document.uri.path;
    const [filePrefix, filePath] = currentFilename.split("/src/");

    const filePathPrefix = getFolderArr(filePath).concat(key).join(".");
    return filePathPrefix;
  } else {
    return "";
  }
}
