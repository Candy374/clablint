import * as _ from "lodash";
import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import randomstring = require("randomstring");

/**
 * 将对象拍平
 * @param obj    原始对象
 * @param prefix
 */
export function flatten(obj: { [key: string]: any }, prefix?: string) {
  var propName = prefix ? prefix + "." : "",
    ret = {} as { [key: string]: any };

  for (var attr in obj) {
    if (_.isArray(obj[attr])) {
      var len = obj[attr].length;
      ret[attr] = obj[attr].join(",");
    } else if (typeof obj[attr] === "object") {
      _.extend(ret, flatten(obj[attr], propName + attr));
    } else {
      ret[propName + attr] = obj[attr];
    }
  }
  return ret;
}

/**
 * 查找当前位置的 Code
 */
export function findPositionInCode(text: string, code: string) {
  const lines = code.split("\n");
  const lineNum = lines.findIndex((line) => line.includes(text));

  if (lineNum === -1) {
    return null;
  }

  let chNum = lines[lineNum].indexOf(text);

  if (text.startsWith(" ")) {
    chNum += 1;
  }

  return new vscode.Position(lineNum, chNum);
}

export function findMatchKey(langObj: { [x: string]: any }, text: any) {
  for (const key in langObj) {
    if (langObj[key] === text) {
      return key;
    }
  }

  return null;
}

export function getSuggestionPath(currentFilename?: string) {
  if (currentFilename?.includes("/src/")) {
    return currentFilename
      .split("/src/")
      .pop()!
      .replace(/\//g, ".")
      .replace(/\.[^.]+$/, ".");
  } else {
    return "";
  }
}
/**
 * 获取文件 Json
 */
export function getLangJson(fileName: string): { [key: string]: any } {
  const fileContent = fs.readFileSync(fileName, { encoding: "utf8" });
  return getLangJsonFromContent(fileContent);
}

export function getLangJsonFromContent(fileContent: string): {
  [key: string]: any;
} {
  let obj;
  let jsObj = {};
  if (fileContent.match(/export\s*default\s*({[\s\S]+);?$/)) {
    obj = fileContent.match(/export\s*default\s*({[\s\S]+);?$/)?.[1];
    obj = obj?.replace(/\s*;\s*$/, "");
  } else {
    obj = fileContent
      .replace(/(const\s+.*\{)/, "{")
      .replace(/(export\s+default.*)/, "")
      .replace("};", "}");
  }

  try {
    jsObj = eval("(" + obj + ")");
  } catch (err) {
    console.log(obj);
    console.error(err);
  }
  return jsObj;
}

/**
 * 获取配置，支持从vscode和配置文件(优先)中取到配置项
 */
export function getConfiguration(text: string): any {
  const configs = vscode.workspace.getConfiguration("clab-lint");

  const value = configs.get(text);
  return value;
}

/**
 * 翻译中文
 */
export function translateText(text: any) {
  const uuidKey = `${randomstring.generate({
    length: 4,
    charset: "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM",
  })}`;

  return uuidKey + text;

  // function _translateText() {
  //   return withTimeout(
  //     new Promise((resolve, reject) => {
  //       // googleTranslate(
  //       //   text,
  //       //   "zh",
  //       //   "en",
  //       //   (err: any, translation: { translatedText: unknown }) => {
  //       //     if (err) {
  //       //       reject(err);
  //       //     } else {
  //       //       resolve(translation.translatedText);
  //       //     }
  //       //   }
  //       // );
  //       // TODO: translate text
  //     }),
  //     3000
  //   );
  // }

  // return retry(_translateText, 3);
}

/**
 * 获取多项目配置
 */
export function getTargetLangPath(currentFilePath: string | string[]) {
  const configFile = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/src/i18n/langs`;

  return configFile;
}

/**
 * 获取当前文件对应的项目路径
 */
export function getCurrentProjectLangPath() {
  let currentProjectLangPath = "";
  const targetLangPath = getTargetLangPath(
    vscode.window.activeTextEditor!.document.uri.path
  );
  if (targetLangPath) {
    currentProjectLangPath = `${targetLangPath}**/*.ts`;
  }
  return currentProjectLangPath;
}

/**
 * 获取当前文件对应的语言路径
 */
export function getLangPrefix() {
  const langPrefix = getTargetLangPath(
    vscode.window.activeTextEditor!.document.uri.path
  );
  return langPrefix;
}

export function sortTranslateList(r1: vscode.Range, r2: vscode.Range) {
  if (r1.start.line === r2.start.line) {
    return r2.start.character - r1.start.character;
  } else {
    return r2.start.line - r1.start.line;
  }
}
