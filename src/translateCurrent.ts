import * as _ from "lodash";
import * as vscode from "vscode";
import randomString = require("randomstring");
import { findMatchKey, getSuggestionPath, sortTranslateList } from "./utils";
import { TargetStr } from "./define";
import { addImportString, replaceAndUpdate } from "./replaceAndUpdate";

export async function translateCurrent(targetStringList: TargetStr[]) {
  const virtualMemory: { [key: string]: any } = {};
  const translateTexts: string[] = [];
  const finalLangObj: { [key: string]: any } = {};

  const suggestionPath = getSuggestionPath(
    vscode.window.activeTextEditor?.document.fileName
  );
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
      const uuidKey = `${randomString.generate({
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
      `替换完成, 修改了${replaceableList.length}个字符串`
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(e.message);
  }
}
