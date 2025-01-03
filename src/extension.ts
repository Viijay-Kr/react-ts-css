"use strict";

import {
  ExtensionContext,
  window,
  workspace,
  languages,
  extensions,
  DocumentSelector,
} from "vscode";
import Settings, { EXT_NAME, getSettings } from "./settings";
import Store from "./store/Store";
import { DefnitionProvider } from "./providers/ts/definitions";
import { HoverProvider } from "./providers/ts/hover";
import {
  SelectorsCompletionProvider,
  ImportCompletionProvider,
} from "./providers/ts/completion";
import { DiagnosticCodeAction } from "./providers/ts/code-actions";
import { CssDocumentColorProvider } from "./providers/css/colors";
import { CssVariablesCompletion } from "./providers/css/completion";
import { CssDefinitionProvider } from "./providers/css/definition";
import { ReferenceProvider } from "./providers/css/references";
import { ReferenceCodeLensProvider } from "./providers/css/codelens";
import { RenameSelectorProvider } from "./providers/css/rename-selector";
import { GitExtension } from "./api/git";

const documentSelector = [
  { scheme: "file", language: "typescriptreact" },
  { scheme: "file", language: "javascriptreact" },
  { scheme: "file", language: "typescript" },
  { scheme: "file", language: "javascript" },
];

const cssDocumentSelector: DocumentSelector = [
  {
    language: "css",
    pattern: "**/*.module.css",
  },
];

const cssModulesDocumentSelector: DocumentSelector = [
  ...cssDocumentSelector,
  {
    language: "scss",
    pattern: "**/*.module.scss",
  },
  {
    language: "less",
    pattern: "**/*.module.less",
  },
];

workspace.onDidRenameFiles((e) => {
  const newFiles = e.files.map((f) => f.newUri);
  Store.addSourceFiles(newFiles);
});

workspace.onDidCreateFiles((e) => {
  Store.addSourceFiles(e.files);
});

window.onDidChangeActiveTextEditor((e) => {
  Store.bootstrap();
});

const syncWithGit = () => {
  const gitExtension = extensions.getExtension("vscode.git")?.exports as
    | GitExtension
    | undefined;
  const git = gitExtension?.getAPI(1);
  if (git) {
    git.onDidChangeState(() => {
      git.repositories.forEach((repo) => {
        repo.state.onDidChange(async () => {
          await Promise.allSettled([
            await Store.loadCSSModules(),
            await Store.loadTSModules(),
          ]).catch();
        });
      });
    });
  }
};

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.onDidChangeTextDocument((e) => {
    // Event is fired when logging to output channel
    if (e.document.fileName.includes(context.extension.id)) return;

    Store.bootstrap();
  });

  workspace.onDidChangeConfiguration(async (e) => {
    const affected = e.affectsConfiguration(EXT_NAME);
    if (affected) {
      Settings.autoComplete = getSettings().get("autoComplete");
      Settings.definition = getSettings().get("definition");
      Settings.peekProperties = getSettings().get("peekProperties");
      Settings.cssAutoComplete = getSettings().get("cssAutoComplete");
      Settings.cssDefinitions = getSettings().get("cssDefinitions");
      Settings.diagnostics = getSettings().get("diagnostics");
      Settings.baseDir = getSettings().get("baseDir");
      Settings.cssSyntaxColor = getSettings().get("cssSyntaxColor");
      Settings.tsCleanUpDefs = getSettings().get("tsCleanUpDefs");
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
  syncWithGit();
  try {
    await syncTsPlugin();
    await Store.bootstrap();
    const _definitionProvider = languages.registerDefinitionProvider(
      documentSelector,
      new DefnitionProvider(),
    );
    const _hoverProvider = languages.registerHoverProvider(
      documentSelector,
      new HoverProvider(),
    );
    const _selectorsCompletionProvider =
      languages.registerCompletionItemProvider(
        documentSelector,
        new SelectorsCompletionProvider(),
        ".",
        "'",
        "[",
      );
    const _importsCompletionProvider = languages.registerCompletionItemProvider(
      documentSelector,
      new ImportCompletionProvider(),
    );
    const _codeActionsProvider = languages.registerCodeActionsProvider(
      documentSelector,
      new DiagnosticCodeAction(context),
    );

    const _cssVariablesCompletion = languages.registerCompletionItemProvider(
      cssDocumentSelector,
      new CssVariablesCompletion(),
      "-",
    );

    const _cssColorProviders = languages.registerColorProvider(
      { scheme: "file", language: "css" },
      new CssDocumentColorProvider(),
    );

    const _cssDefinitionProvider = languages.registerDefinitionProvider(
      { scheme: "file", language: "css" },
      new CssDefinitionProvider(),
    );

    const _cssReferenceProvider = languages.registerReferenceProvider(
      cssModulesDocumentSelector,
      new ReferenceProvider(),
    );

    const _cssCodeLensProvider = languages.registerCodeLensProvider(
      cssModulesDocumentSelector,
      new ReferenceCodeLensProvider(),
    );
    const _cssRenameSelectorProvider = languages.registerRenameProvider(
      cssModulesDocumentSelector,
      new RenameSelectorProvider(),
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
    context.subscriptions.push(_cssRenameSelectorProvider);
  } catch (e) {
    Store.outputChannel.error((e as Error).message);
    window.showWarningMessage(
      "Something went wrong while activating React-TS-CSS extension. Check the output channel",
    );
  }
}

export function deactivate() {
  Store.flushStorage();
}
