import * as _ from "lodash";
import * as vscode from "vscode";
import randomString = require("randomstring");
import { findMatchKey, getSuggestionPath, sortTranslateList } from "./utils";
import { TargetStr } from "./define";
import { addImportString, replaceAndUpdate } from "./replaceAndUpdate";
import * as fs from "fs-extra";
import * as path from "path";

export async function translateCurrent(targetStringList: TargetStr[]) {
  const labelMap: { [label: string]: string } = {}; //
  const translateTexts: string[] = [];
  const keyMap: { [key: string]: string } = {};

  const suggestionPath = getSuggestionPath(
    vscode.window.activeTextEditor?.document.fileName
  );

  const replaceableList = [];
  let i = 0;
  for (const curr of targetStringList) {
    let key = keyMap[curr.text];

    if (!key) {
      const uuidKey = randomString.generate({
        length: 8,
        charset: "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM",
      });

      const transText = translateTexts[i]
        ? _.camelCase(translateTexts[i])
        : uuidKey;
      let transKey = `${suggestionPath}${transText}`;
      let occurTime = 0;
      // 防止出现前四位相同但是整体文案不同的情况
      while (
        keyMap[transKey] !== curr.text &&
        keyMap[`${transKey}${occurTime || ""}`]
      ) {
        occurTime++;
      }

      if (occurTime) {
        transKey = `${transKey}${occurTime}`;
      }

      keyMap[transKey] = curr.text;
      key = transKey;
    }

    if (!labelMap[curr.text]) {
      labelMap[curr.text] = key;
    }

    replaceableList.push({ target: curr, key });

    i++;
  }

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
      `替换完成, 修改了${replaceableList.length}个字符串`
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(e.message);
  }
}

export function getAllFiles(dir: string): any {
  const files = fs.readdirSync(dir).reduce((files: any, file: string) => {
    if (file === "node_modules" || file === "i18n") {
      return [...files];
    }
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
  }, []);
  return files;
}

export function translateAll() {}
