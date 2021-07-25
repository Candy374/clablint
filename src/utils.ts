/**
 * @author linhuiw
 * @desc 工具方法
 */
import * as _ from 'lodash';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 将对象拍平
 * @param obj    原始对象
 * @param prefix
 */
export function flatten(obj: Record<any, any>, prefix?: string) {
  var propName = prefix ? prefix + '.' : '',
    ret = {} as Record<any, any> ;

  for (var attr in obj) {
    if (_.isArray(obj[attr])) {
      var len = obj[attr].length;
      ret[attr] = obj[attr].join(',');
    } else if (typeof obj[attr] === 'object') {
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
  const lines = code.split('\n');
  const lineNum = lines.findIndex(line => line.includes(text));

  if (lineNum === -1) {
    return null;
  }

  let chNum = lines[lineNum].indexOf(text);

  if (text.startsWith(' ')) {
    chNum += 1;
  }

  return new vscode.Position(lineNum, chNum);
}

export function findMatchKey(langObj: { [x: string]: any; }, text: any) {
  for (const key in langObj) {
    if (langObj[key] === text) {
      return key;
    }
  }

  return null;
}

/**
 * 获取文件夹下所有文件
 * @function getAllFiles
 * @param  {string} dir Dir path string.
 * @return {string[]} Array with all file names that are inside the directory.
 */
export function getAllFiles  (dir: string): any {
  fs.readdirSync(dir).reduce((files: any, file: string) => {
    // 避免读取node_modules造成性能问题
    if (file === 'node_modules') {
      return [...files];
    }
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
  }, []);
}

/**
 * 获取文件 Json
 */
export function getLangJson(fileName: string) : {[key: string]: any} {
  const fileContent = fs.readFileSync(fileName, { encoding: 'utf8' });
  let obj = fileContent.match(/export\s*default\s*({[\s\S]+);?$/)?.[1];
  obj = obj?.replace(/\s*;\s*$/, '');
  let jsObj = {};
  try {
    jsObj = eval('(' + obj + ')');
  } catch (err) {
    console.log(obj);
    console.error(err);
  }
  return jsObj;
}

/**
 * 获取配置，支持从vscode和配置文件(优先)中取到配置项
 */
export const getConfiguration = (text: string) => {
  let value = vscode.workspace.getConfiguration('convertlab-i18n-linter').get(text);

  return value;
};

/**
 * 查找kiwi-cli配置文件
 */
// export const getConfigFile = () => {
//   let kiwiConfigJson = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/.kiwirc.js`;
//   // 先找js
//   if (!fs.existsSync(kiwiConfigJson)) {
//     kiwiConfigJson = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/.kiwirc.ts`;
//     //再找ts
//     if (!fs.existsSync(kiwiConfigJson)) {
//       return null;
//     }
//   }
//   return kiwiConfigJson;
// };

/**
 * 查找convertlab-linter配置文件
 */
export const getKiwiLinterConfigFile = () => {
  let kiwiConfigJson = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/.kiwi`;
  // 先找js
  if (!fs.existsSync(kiwiConfigJson)) {
    return null;
  }
  return kiwiConfigJson;
};


/**
 * 重试方法
 * @param asyncOperation
 * @param times
 */
function retry(asyncOperation: { (): Promise<any>; (): Promise<any>; }, times = 1) {
  let runTimes = 1;
  function handleReject(e: any): any{
    if (runTimes++ < times) {
      return asyncOperation().catch(handleReject);
    } else {
      throw e;
    }
  };
  return asyncOperation().catch(handleReject);
}

/**
 * 设置超时
 * @param promise
 * @param ms
 */
function withTimeout(promise: Promise<unknown>, ms: number | undefined) {
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(`Promise timed out after ${ms} ms.`);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * 翻译中文
 */
export function translateText(text: any) {
  // const googleApiKey = getGoogleApiKey();
  // const { translate: googleTranslate } = require('google-translate')(googleApiKey);

  // function _translateText() {
  //   return withTimeout(
  //     new Promise((resolve, reject) => {
  //       googleTranslate(text, 'zh', 'en', (err: any, translation: { translatedText: unknown; }) => {
  //         if (err) {
  //           reject(err);
  //         } else {
  //           resolve(translation.translatedText);
  //         }
  //       });
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
  const configFile = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/.kiwi`;
  let targetLangPath = '';

  try {
    if (fs.existsSync(configFile)) {
      const { projects = [] } = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      console.log(projects);
      for (const config of projects) {
        if (currentFilePath.indexOf(`/${config.target}/`) > -1) {
          targetLangPath = `${vscode.workspace.workspaceFolders?.[0].uri.fsPath}/${config.kiwiDir}/zh_CN/`;
          return targetLangPath;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }

  return targetLangPath;
}

/**
 * 获取当前文件对应的项目路径
 */
export function getCurrentProjectLangPath() {
  let currentProjectLangPath = '';
  const targetLangPath = getTargetLangPath(vscode.window.activeTextEditor!.document.uri.path);
  if (targetLangPath) {
    currentProjectLangPath = `${targetLangPath}**/*.ts`;
  }
  return currentProjectLangPath;
}

/**
 * 获取当前文件对应的语言路径
 */
 export function getLangPrefix() {
  const langPrefix = getTargetLangPath(vscode.window.activeTextEditor!.document.uri.path);
  return langPrefix;
}
