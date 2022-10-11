'use strict';

import { ExtensionContext, window, workspace, languages } from 'vscode';
import { definitionProvider } from './providers/definitions';
import { hoverProvider } from './providers/hover';
import { completetionProvider } from './providers/completion';
import { Settings } from './settings';
import Storage from './storage/Storage';

const documentSelector = [
	{ scheme: 'file', language: 'typescriptreact' },
	{ scheme: 'file', language: 'typescript' }
];

let workSpaceFiles: string[];
const settings = new Settings();

workspace.onDidCreateFiles((e) => {
	Storage.addSourceFiles(e.files);
});

workspace.onDidOpenTextDocument(() => {
	Storage.bootStrap();
});

workspace.onDidChangeTextDocument(() => {
	Storage.bootStrap();
});



export async function activate(context: ExtensionContext): Promise<void> {
	try {
		Storage.bootStrap();
		const _definitionProvider = languages.registerDefinitionProvider(documentSelector, definitionProvider({ files: workSpaceFiles }));
		const _hoverProvider = languages.registerHoverProvider(documentSelector, hoverProvider({ files: workSpaceFiles }));
		const _completionProvider = languages.registerCompletionItemProvider(
			documentSelector,
			completetionProvider({
				files: workSpaceFiles
			}),
			'.', '\'', '\[');

		if (settings.autoComplete) {
			context.subscriptions.push(_completionProvider);
		}
		if (settings.definition) {
			context.subscriptions.push(_definitionProvider);
		}
		if (settings.references) {
			context.subscriptions.push(_hoverProvider);
		}
		window.showInformationMessage('React-TS-CSS activated successfully');
	} catch (e) {
		window.showWarningMessage('Something went wrong while activating React-TS-CSS extension');
	}
}

export function deactivate() {
	Storage.clear();
}