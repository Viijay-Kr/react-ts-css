/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { ExtensionContext, window, workspace, languages } from 'vscode';
import * as fsg from 'fast-glob';
import { definitionProvider } from './providers/definitions';
import { hoverProvider } from './providers/hover';
import { completetionProvider } from './providers/completion';
import { Settings } from './settings';
const documentSelector = [
	{ scheme: 'file', language: 'typescriptreact' },
	{ scheme: 'file', language: 'typescript' }
];

let scssFiles: string[];
const settings = new Settings();
export async function activate(context: ExtensionContext): Promise<void> {
	const uri = window.activeTextEditor?.document?.uri;
	if (uri) {
		const workspaceRoot = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
		scssFiles = await fsg('**/*.scss', {
			cwd: workspaceRoot,
			ignore: ['node_modules', 'build'],
			absolute: true,
		});
	}
	const _definitionProvider = languages.registerDefinitionProvider(documentSelector, definitionProvider({ files: scssFiles }));
	const _hoverProvider = languages.registerHoverProvider(documentSelector, hoverProvider({ files: scssFiles }));
	const _completionProvider = languages.registerCompletionItemProvider(
		documentSelector,
		completetionProvider({
			files: scssFiles
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

}

export function deactivate() {
}