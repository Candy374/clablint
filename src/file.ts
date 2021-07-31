/**
 * @author linhuiw
 * @desc 文件相关操作
 */
import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as _ from "lodash";
import * as prettier from "prettier";
import { getLangData } from "./getLangData";
import { getLangPrefix } from "./utils";
import { LANG_PREFIX } from "./const";

function getWorkspacePath() {
  const path = vscode.window.activeTextEditor!.document.uri.path;
  for (const { uri } of vscode.workspace.workspaceFolders || []) {
    if (path.startsWith(uri.fsPath)) {
      return uri.fsPath;
    }
  }
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
  if (restPath.length === 1) {
    restPath.unshift(entity);
    folderPath = folder;
  } else {
    folderPath = `${folder}/${entity}`;
  }
  const fullKey = restPath.join(".");
  const prefixPath = getWorkspacePath();
  const targetFilename = `${prefixPath}/src/${folderPath}/i18n/index.ts`;
  const filename = restPath[restPath.length - 1];

  if (!fs.existsSync(targetFilename)) {
    fs.outputFileSync(targetFilename, generateNewLangFile(fullKey, text));
    addImportToMetaFile(`${folderPath}/i18n`, entity);
    vscode.window.showInformationMessage(`成功新建文件 ${targetFilename}`);
  } else {
    // 清除 require 缓存，解决手动更新语言文件后再自动抽取，导致之前更新失效的问题
    const mainContent = getLangData(targetFilename);
    const obj = mainContent;

    if (Object.keys(obj).length === 0) {
      vscode.window.showWarningMessage(
        `${filename} 解析失败，该文件包含的文案无法自动补全`
      );
    }

    if (validateDuplicate && _.get(obj, fullKey) !== undefined) {
      vscode.window.showErrorMessage(
        `${targetFilename} 中已存在 key 为 \`${fullKey}\` 的翻译，请重新命名变量`
      );
      throw new Error("duplicate");
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
function prettierFile(fileContent: string) {
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

export function addImportToMainLangFile(newFilename: string) {
  let mainContent = "";
  const langPrefix = getLangPrefix() || LANG_PREFIX;
  if (fs.existsSync(`${langPrefix}index.ts`)) {
    mainContent = fs.readFileSync(`${langPrefix}index.ts`, "utf8");
    mainContent = mainContent.replace(
      /^(\s*import.*?;)$/m,
      `$1\nimport ${newFilename} from './${newFilename}';`
    );

    if (/\n(}\);)/.test(mainContent)) {
      if (/\,\n(}\);)/.test(mainContent)) {
        /** 最后一行包含,号 */
        mainContent = mainContent.replace(/(}\);)/, `  ${newFilename},\n$1`);
      } else {
        /** 最后一行不包含,号 */
        mainContent = mainContent.replace(
          /\n(}\);)/,
          `,\n  ${newFilename},\n$1`
        );
      }
    }

    if (/\n(};)/.test(mainContent)) {
      if (/\,\n(};)/.test(mainContent)) {
        /** 最后一行包含,号 */
        mainContent = mainContent.replace(/(};)/, `  ${newFilename},\n$1`);
      } else {
        /** 最后一行不包含,号 */
        mainContent = mainContent.replace(/\n(};)/, `,\n  ${newFilename},\n$1`);
      }
    }
  } else {
    mainContent = `import ${newFilename} from './${newFilename}';\n\nexport default Object.assign({}, {\n  ${newFilename},\n});`;
  }

  fs.outputFileSync(`${langPrefix}index.ts`, mainContent);
}

function addImportToMetaFile(relativeFilename: string, entity: string) {
  let mainContent = "";

  let mainFile = `${getWorkspacePath()}/src/i18n/translationMeta.ts`;
  if (fs.existsSync(mainFile)) {
    mainContent = fs.readFileSync(mainFile, "utf8");
    if (mainContent.includes(`${entity},`)) {
      return;
    }

    // TODO: check filename or entity is exists?
    mainContent = mainContent
      .replace(
        /^(\s*import.*?;)$/m,
        `$1\nimport ${entity} from '${relativeFilename}';`
      )
      .replace(/\};/, `${entity}, };`);

    mainContent = prettierFile(mainContent);
  } else {
    mainContent = `import ${entity} from '${relativeFilename}';
    const translationMap = {
      ${entity},
    };
    export default translationMap;`;
  }

  fs.outputFileSync(mainFile, mainContent);
}
