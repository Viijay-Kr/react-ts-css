"use strict";

import { ExtensionContext, window, workspace, languages } from "vscode";
import { definitionProvider } from "./providers/definitions";
import { hoverProvider } from "./providers/hover";
import {
  importsCompletionProvider,
  selectorsCompletetionProvider,
} from "./providers/completion";
import Settings, { EXT_NAME, getSettings } from "./settings";
import Storage from "./storage/Storage";

const documentSelector = [
  { scheme: "file", language: "typescriptreact" },
  { scheme: "file", language: "typescript" },
];

workspace.onDidCreateFiles((e) => {
  Storage.addSourceFiles(e.files);
});

workspace.onDidOpenTextDocument(() => {
  Storage.bootStrap();
});

workspace.onDidChangeTextDocument(() => {
  Storage.bootStrap();
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
    await Storage.bootStrap();
    const _definitionProvider = languages.registerDefinitionProvider(
      documentSelector,
      definitionProvider({})
    );
    const _hoverProvider = languages.registerHoverProvider(
      documentSelector,
      hoverProvider({})
    );
    const _selectorsCompletionProvider =
      languages.registerCompletionItemProvider(
        documentSelector,
        selectorsCompletetionProvider({}),
        ".",
        "'",
        "["
      );
    const _importsCompletionProvider = languages.registerCompletionItemProvider(
      documentSelector,
      importsCompletionProvider()
    );

    context.subscriptions.push(_selectorsCompletionProvider);
    context.subscriptions.push(_importsCompletionProvider);
    context.subscriptions.push(_definitionProvider);
    context.subscriptions.push(_hoverProvider);
  } catch (e) {
    console.error(e);
    window.showWarningMessage(
      "Something went wrong while activating React-TS-CSS extension"
    );
  }
}

export function deactivate() {
  Storage.clear();
}
