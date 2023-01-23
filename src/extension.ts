"use strict";

import { ExtensionContext, window, workspace, languages } from "vscode";
import { DefnitionProvider } from "./providers/ts/definitions";
import { HoverProvider } from "./providers/ts/hover";
import {
  SelectorsCompletionProvider,
  ImportCompletionProvider,
} from "./providers/ts/completion";
import Settings, { EXT_NAME, getSettings } from "./settings";
import Store from "./store/Store";
import { DiagnosticCodeAction } from "./providers/ts/code-actions";
import { DocumentColorProvider } from "./providers/css/colors";
import { CssVariablesCompletion } from "./providers/css/completion";

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
  Store.addSourceFiles(e.files);
});

workspace.onDidChangeTextDocument((e) => {
  Store.bootStrap();
});

window.onDidChangeActiveTextEditor((e) => {
  Store.bootStrap();
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
    await Store.bootStrap();
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
      new CssVariablesCompletion(),
      "-"
    );

    const _cssColorProviders = languages.registerColorProvider(
      cssDocumentSelector,
      new DocumentColorProvider()
    );

    context.subscriptions.push(_selectorsCompletionProvider);
    context.subscriptions.push(_importsCompletionProvider);
    context.subscriptions.push(_cssVariablesCompletion);
    context.subscriptions.push(_definitionProvider);
    context.subscriptions.push(_hoverProvider);
    context.subscriptions.push(_codeActionsProvider);
    context.subscriptions.push(_cssColorProviders);
  } catch (e) {
    console.error(e);
    window.showWarningMessage(
      "Something went wrong while activating React-TS-CSS extension"
    );
  }
}

export function deactivate() {
  Store.flushStorage();
}
