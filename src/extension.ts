// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { findAllI18N } from './findAllI18N';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('clab-lint.findAllI18N', findAllI18N));
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "clab-lint" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('clab-lint.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from clab-lint!');
	});

	context.subscriptions.push(disposable);


	// 识别到出错时点击小灯泡弹出的操作
	// const hasLightBulb = getConfiguration('enableReplaceSuggestion');
	// if (hasLightBulb) {
	//   context.subscriptions.push(
	// 	vscode.languages.registerCodeActionsProvider(
	// 	  [
	// 		{ scheme: 'file', language: 'typescriptreact' },
	// 		{ scheme: 'file', language: 'html' },
	// 		{ scheme: 'file', language: 'typescript' },
	// 		{ scheme: 'file', language: 'javascriptreact' },
	// 		{ scheme: 'file', language: 'javascript' },
	// 		{ scheme: '*', language: 'vue' }
	// 	  ],
	// 	  {
	// 		provideCodeActions: function(document, range, context, token) {
	// 		  const targetStr = targetStrs.find(t => range.intersection(t.range) !== undefined);
	// 		  if (targetStr) {
	// 			const sameTextStrs = targetStrs.filter(t => t.text === targetStr.text);
	// 			const text = targetStr.text;
	// 			const actions = [];
	// 			finalLangObj = getSuggestLangObj();
	// 			for (const key in finalLangObj) {
	// 			  if (finalLangObj[key] === text) {
	// 				actions.push({
	// 				  title: `抽取为 \`I18N.${key}\``,
	// 				  command: 'vscode-i18n-linter.extractI18N',
	// 				  arguments: [
	// 					{
	// 					  targets: sameTextStrs,
	// 					  varName: `I18N.${key}`
	// 					}
	// 				  ]
	// 				});
	// 			  }
	// 			}
  
	// 			return actions.concat({
	// 			  title: `抽取为自定义 I18N 变量（共${sameTextStrs.length}处）`,
	// 			  command: 'vscode-i18n-linter.extractI18N',
	// 			  arguments: [
	// 				{
	// 				  targets: sameTextStrs
	// 				}
	// 			  ]
	// 			});
	// 		  }
	// 		}
	// 	  }
	// 	)
	//   );
	// }
}

// this method is called when your extension is deactivated
export function deactivate() {}
