"use strict";

import { ExtensionContext, window, workspace, languages } from "vscode";
import { DefnitionProvider } from "./providers/definitions";
import { HoverProvider } from "./providers/hover";
import {
  SelectorsCompletionProvider,
  ImportCompletionProvider,
  CssVariablesCompletion,
} from "./providers/completion";
import Settings, { EXT_NAME, getSettings } from "./settings";
import Storage_V2 from "./storage/Storage_v2";
import { DiagnosticCodeAction } from "./providers/code-actions";

const tsDocumentSelector = [
  { scheme: "file", language: "typescriptreact" },
  { scheme: "file", language: "typescript" },
];

const cssDocumentSelector = [
  {
    scheme: "file",
    language: "css",
  },
];

workspace.onDidCreateFiles((e) => {
  Storage_V2.addSourceFiles(e.files);
});

workspace.onDidChangeTextDocument(() => {
  Storage_V2.bootStrap();
});

window.onDidChangeActiveTextEditor((e) => {
  Storage_V2.bootStrap();
});

workspace.onDidChangeConfiguration((e) => {
  const affected = e.affectsConfiguration(EXT_NAME);
  if (affected) {
    Settings.autoComplete = getSettings().get("autoComplete");
    Settings.definition = getSettings().get("definition");
    Settings.peek = getSettings().get("peek");
  }
});

export async function activate(context: ExtensionContext): Promise<void> {
  try {
    await Storage_V2.bootStrap();
    const _definitionProvider = languages.registerDefinitionProvider(
      tsDocumentSelector,
      new DefnitionProvider()
    );
    const _hoverProvider = languages.registerHoverProvider(
      tsDocumentSelector,
      new HoverProvider()
    );
    const _selectorsCompletionProvider =
      languages.registerCompletionItemProvider(
        tsDocumentSelector,
        new SelectorsCompletionProvider(),
        ".",
        "'",
        "["
      );
    const _importsCompletionProvider = languages.registerCompletionItemProvider(
      tsDocumentSelector,
      new ImportCompletionProvider()
    );
    const _codeActionsProvider = languages.registerCodeActionsProvider(
      tsDocumentSelector,
      new DiagnosticCodeAction(context)
    );

    const _cssVariablesCompletion = languages.registerCompletionItemProvider(
      cssDocumentSelector,
      new CssVariablesCompletion()
    );

    context.subscriptions.push(_selectorsCompletionProvider);
    context.subscriptions.push(_importsCompletionProvider);
    context.subscriptions.push(_cssVariablesCompletion);
    context.subscriptions.push(_definitionProvider);
    context.subscriptions.push(_hoverProvider);
    context.subscriptions.push(_codeActionsProvider);
  } catch (e) {
    console.error(e);
    window.showWarningMessage(
      "Something went wrong while activating React-TS-CSS extension"
    );
  }
}

export function deactivate() {
  Storage_V2.flushStorage();
}
