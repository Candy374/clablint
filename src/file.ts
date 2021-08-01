/**
 * @author linhuiw
 * @desc 文件相关操作
 */
import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as _ from "lodash";
import * as prettier from "prettier";
import { getLangData } from "./getLangData";
import { getLangJsonFromContent, getLangPrefix } from "./utils";
import { LANG_PREFIX } from "./const";

function getWorkspacePath() {
  const path = vscode.window.activeTextEditor!.document.uri.path;
  for (const { uri } of vscode.workspace.workspaceFolders || []) {
    if (path.startsWith(uri.fsPath)) {
      return uri.fsPath;
    }
  }
}

export function getMainTranslateFile() {
  return `${getWorkspacePath()}/src/i18n/translationMeta.ts`;
}

export function updateLangFiles(
  keyValue: string,
  text: string,
  validateDuplicate: boolean
) {
  if (!keyValue.startsWith("I18n.")) {
    return;
  }
  let [, folder, entity, ...restPath] = keyValue.split(".");
  let folderPath = "";
  if (restPath.length <= 1) {
    restPath.unshift(entity);
    folderPath = folder;
    if (folder === "common") {
      entity = "common";
    }
  } else {
    folderPath = `${folder}/${entity}`;
  }
  const fullKey = restPath.join(".");
  const prefixPath = getWorkspacePath();
  const targetFilename =
    folderPath === "common"
      ? `${prefixPath}/src/i18n/common.ts`
      : `${prefixPath}/src/${folderPath}/i18n/index.ts`;
  const filename = restPath[restPath.length - 1];

  if (!fs.existsSync(targetFilename)) {
    fs.outputFileSync(targetFilename, generateNewLangFile(fullKey, text));
    vscode.window.showInformationMessage(`成功新建文件 ${targetFilename}`);
    addImportToMetaFile(`${folderPath}/i18n`, folderPath.split("/"));
  } else {
    // 清除 require 缓存，解决手动更新语言文件后再自动抽取，导致之前更新失效的问题
    const mainContent = getLangData(targetFilename);
    const obj = mainContent;

    if (Object.keys(obj).length === 0) {
      vscode.window.showWarningMessage(
        `解析失败，该文件包含的文案无法自动补全： ${filename}`
      );
    }

    if (_.get(obj, fullKey) !== undefined) {
      if (validateDuplicate) {
        vscode.window.showErrorMessage(
          `已存在 key 为 \`${fullKey}\` 的翻译，请重新命名变量. 重名变量在： ${targetFilename}`
        );
        throw new Error("duplicate");
      } else {
        return;
      }
    }

    // \n 会被自动转义成 \\n，这里转回来
    text = text.replace(/\\n/gm, "\n");
    _.set(obj, fullKey, text);
    fs.writeFileSync(
      targetFilename,
      prettierFile(
        `const ${entity} = ${JSON.stringify(obj)}; export default ${entity}`
      )
    );
  }
}
/**
 * 使用 Prettier 格式化文件
 * @param fileContent
 */
export function prettierFile(fileContent: string) {
  try {
    return prettier.format(fileContent, {
      parser: "typescript",
      trailingComma: "all",
      singleQuote: true,
    });
  } catch (e) {
    console.error(`代码格式化报错！${e.toString()}\n代码为：${fileContent}`);
    return fileContent;
  }
}

export function generateNewLangFile(key: string, value: string) {
  const obj = _.set({}, key, value);

  return prettierFile(`export default ${JSON.stringify(obj, null, 2)}`);
}

function addImportToMetaFile(relativeFilename: string, folders: string[]) {
  let mainContent = "";

  let mainFile = getMainTranslateFile();
  const [folder, entity = folder] = folders;
  if (fs.existsSync(mainFile)) {
    mainContent = fs.readFileSync(mainFile, "utf8");

    const constStr = "const translationMap = ";
    const [importStrings, others] = mainContent.split(constStr);

    const importString = `import ${entity} from '${relativeFilename}'`;
    if (importStrings.split("\n").includes(importString)) {
      return;
    }

    const transMap = getLangJsonFromContent(
      `${constStr} ${others.replace(/(\w)(\s?}?,)/g, "$1:''$2")}`
    );

    if (Object.keys(transMap).length === 0) {
      vscode.window.showInformationMessage(
        `引入新的翻译文件失败，请手动在文件${mainFile}中添加 ${importString} ${folders.join(
          "."
        )}`
      );
      return;
    }

    if (_.get(transMap, folders.join(".")) !== undefined) {
      return;
    }

    _.set(transMap, folders.join("."), "");
    const content = JSON.stringify(transMap)
      .replace(/:""/g, "")
      .replace(/{"/g, "{")
      .replace(/"}/g, "}")
      .replace(/",/g, ",")
      .replace(/,"/g, ",")
      .replace(/":/g, ":");

    mainContent = `${importStrings} ${importString}; ${constStr} ${content};
    export default translationMap`;

    mainContent = prettierFile(mainContent);

    vscode.window.showInformationMessage(`成功引入新的翻译文件 ${entity}`);
  } else {
    mainContent = `import ${entity} from '${relativeFilename}';
    const translationMap = {
      ${entity},
    };
    export default translationMap;`;
  }

  fs.outputFileSync(mainFile, mainContent);
}
