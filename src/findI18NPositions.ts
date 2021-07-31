/**
 * credits https://github.com/nefe/vscode-toolkits/blob/master/src/findI18NPositions.ts
 */

import * as ts from "typescript";
import * as vscode from "vscode";
import * as _ from "lodash";
import { getFolderArr, getI18N } from "./getLangData";

class Cache {
  memories = [] as Array<{ code: string; positions: Position[] }>;
  addCache(code: string, positions: Position[]) {
    this.memories.push({
      code,
      positions,
    });

    if (this.memories.length > 8) {
      this.memories.shift();
    }
  }
  getPositionsByCode(code: string) {
    const mem = this.memories.find((mem) => mem.code === code);
    if (mem && mem.positions) {
      return mem.positions;
    }

    return false;
  }
}

const cache = new Cache();

export class Position {
  start!: number;
  cn!: string;
  code!: string;
}

/** 使用正则匹配{{}} */
function getRegexMatches(I18N: any, code: string) {
  const lines = code.split("\n");
  const positions: Position[] = [];
  /** 匹配{{I18N.}} */
  const reg = new RegExp(/I18n.(.*)/);
  const normalReg = new RegExp(/I18n.(.*)/);
  (lines || []).map((line, index) => {
    const match = reg.exec(line);
    let exps = _.get(match, [1]);
    if (!exps) {
      exps = _.get(normalReg.exec(line), [1]);
    }
    if (exps) {
      exps = exps.trim();
      exps = exps.split("}")[0];
      exps = exps.split(")")[0];
      exps = exps.split(",")[0];
      exps = exps.split(";")[0];
      exps = exps.split('"')[0];
      exps = exps.split("'")[0];
      exps = exps.split(" ")[0];

      const currentFilename = vscode.window.activeTextEditor!.document.uri.path;
      const [filePrefix, filePath] = currentFilename.split("/src/");

      const filePathPrefix = getFolderArr(filePath).join(".");

      const code = exps.replace(filePathPrefix, "").replace(/^\./, "");
      const position = new Position();
      const transformedCn = _.get(I18N, code.split("."));
      if (typeof transformedCn === "string") {
        position.cn = transformedCn;
        (position as any).line = index;
        position.code = code;
        positions.push(position);
      }
    }
  });
  return positions;
}

/**
 * 查找 I18N 表达式
 * @param code
 */
export function findI18NPositions(code: string) {
  const cachedPoses = cache.getPositionsByCode(code);
  if (cachedPoses) {
    return cachedPoses;
  }

  const I18N = getI18N();
  const positions = [] as Position[];

  const regexMatches = getRegexMatches(I18N, code);
  let matchPositions = positions.concat(regexMatches) as any;
  matchPositions = _.uniqBy(
    matchPositions,
    (position: Position & { line: number }) => {
      return `${position.code}-${position.line}`;
    }
  );

  cache.addCache(code, matchPositions);
  return matchPositions;
}
