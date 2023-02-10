"use strict";

import {
  ExtensionContext,
  window,
  workspace,
  languages,
  extensions,
} from "vscode";
import { DefnitionProvider } from "./providers/ts/definitions";
import { HoverProvider } from "./providers/ts/hover";
import {
  SelectorsCompletionProvider,
  ImportCompletionProvider,
} from "./providers/ts/completion";
import Settings, { EXT_NAME, getSettings } from "./settings";
import Store from "./store/Store";
import { DiagnosticCodeAction } from "./providers/ts/code-actions";
import { CssDocumentColorProvider } from "./providers/css/colors";
import { CssVariablesCompletion } from "./providers/css/completion";
import { CssDefinitionProvider } from "./providers/css/definition";
import { ReferenceProvider } from "./providers/css/references";
import { ReferenceCodeLensProvider } from "./providers/css/codelens";

const documentSelector = [
  { scheme: "file", language: "typescriptreact" },
  { scheme: "file", language: "javascriptreact" },
  { scheme: "file", language: "typescript" },
  { scheme: "file", language: "javascript" },
];

const cssDocumentSelector = [
  {
    scheme: "file",
    language: "css",
  },
];

const cssModulesDocumentSelector = [
  ...cssDocumentSelector,
  {
    scheme: "file",
    language: "scss",
  },
  {
    scheme: "file",
    language: "less",
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

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.onDidChangeConfiguration(async (e) => {
    const affected = e.affectsConfiguration(EXT_NAME);
    if (affected) {
      Settings.autoComplete = getSettings().get("autoComplete");
      Settings.definition = getSettings().get("definition");
      Settings.peekProperties = getSettings().get("peekProperties");
      Settings.cssAutoComplete = getSettings().get("cssAutoComplete");
      Settings.tsconfig = getSettings().get("tsconfig");
      Settings.cssDefinitions = getSettings().get("cssDefinitions");
      Settings.diagnostics = getSettings().get("diagnostics");
      Settings.baseDir = getSettings().get("baseDir");
      Settings.cssSyntaxColor = getSettings().get("cssSyntaxColor");
      Settings.tsCleanUpDefs = getSettings().get("typecriptCleanUpDefs");
      Settings.cleanUpDefs = getSettings().get("cleanUpDefs");
      Settings.references = getSettings().get("references");
      Settings.codeLens = getSettings().get("codelens");
      await syncTsPlugin();
    }
  });
  const syncTsPlugin = async () => {
    const ext = extensions.getExtension("vscode.typescript-language-features");
    if (ext) {
      await ext.activate();
      const tsAPi = ext.exports.getAPI(0);
      tsAPi.configurePlugin("typescript-cleanup-definitions", {
        name: "typescript-cleanup-definitions",
        modules: Settings.cleanUpDefs,
        enable: Settings.tsCleanUpDefs,
      });
    }
  };

  try {
    await syncTsPlugin();
    await Store.bootStrap();
    const _definitionProvider = languages.registerDefinitionProvider(
      documentSelector,
      new DefnitionProvider()
    );
    const _hoverProvider = languages.registerHoverProvider(
      documentSelector,
      new HoverProvider()
    );
    const _selectorsCompletionProvider =
      languages.registerCompletionItemProvider(
        documentSelector,
        new SelectorsCompletionProvider(),
        ".",
        "'",
        "["
      );
    const _importsCompletionProvider = languages.registerCompletionItemProvider(
      documentSelector,
      new ImportCompletionProvider()
    );
    const _codeActionsProvider = languages.registerCodeActionsProvider(
      documentSelector,
      new DiagnosticCodeAction(context)
    );

    const _cssVariablesCompletion = languages.registerCompletionItemProvider(
      cssDocumentSelector,
      new CssVariablesCompletion(),
      "-"
    );

    const _cssColorProviders = languages.registerColorProvider(
      cssDocumentSelector,
      new CssDocumentColorProvider()
    );

    const _cssDefinitionProvider = languages.registerDefinitionProvider(
      cssDocumentSelector,
      new CssDefinitionProvider()
    );

    const _cssReferenceProvider = languages.registerReferenceProvider(
      cssModulesDocumentSelector,
      new ReferenceProvider()
    );

    const _cssCodeLensProvider = languages.registerCodeLensProvider(
      cssModulesDocumentSelector,
      new ReferenceCodeLensProvider()
    );

    context.subscriptions.push(_selectorsCompletionProvider);
    context.subscriptions.push(_importsCompletionProvider);
    context.subscriptions.push(_cssVariablesCompletion);
    context.subscriptions.push(_definitionProvider);
    context.subscriptions.push(_hoverProvider);
    context.subscriptions.push(_codeActionsProvider);
    context.subscriptions.push(_cssColorProviders);
    context.subscriptions.push(_cssDefinitionProvider);
    context.subscriptions.push(_cssReferenceProvider);
    context.subscriptions.push(_cssCodeLensProvider);
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
