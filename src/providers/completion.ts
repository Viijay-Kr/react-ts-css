import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionList,
  Range,
  Position,
  TextEdit,
  CompletionTriggerKind,
} from "vscode";
import Settings from "../settings";
import Storage from "../storage/Storage";
import { ProviderFactory, ProviderKind } from "./ProviderFactory";
import { ProviderParams } from "./types";

export const selectorsCompletetionProvider: (
  params: ProviderParams
) => CompletionItemProvider = () => ({
  async provideCompletionItems(document, position, _token, _context) {
    if (!Settings.autoComplete) {
      return;
    }
    try {
      if (
        _context.triggerKind !== CompletionTriggerKind.TriggerCharacter ||
        _token.isCancellationRequested
      ) {
        return; // Storage.getCompletionsFromCache();
      }
      try {
        const provider = new ProviderFactory({
          providerKind: ProviderKind.Completion,
          position,
          document,
        });
        provider.preProcessSelectorCompletions();
        const allSelectors = await provider.getSelectorsForCompletion();

        const completionList = new CompletionList(
          allSelectors.map((s) => {
            const completionItem = new CompletionItem(
              s.label,
              CompletionItemKind.Value
            );
            const triggerKind = _context.triggerKind;
            const triggerCharacter = _context.triggerCharacter;
            completionItem.insertText = (() => {
              if (triggerKind === CompletionTriggerKind.TriggerCharacter) {
                switch (triggerCharacter) {
                  case "[":
                    return `'${s.label}'`;
                  case "'":
                    return s.label;
                  case ".":
                    completionItem.additionalTextEdits = [
                      new TextEdit(
                        new Range(
                          new Position(position.line, position.character - 1),
                          new Position(position.line, position.character)
                        ),
                        ""
                      ),
                    ];
                    if (s.label.includes("-")) {
                      return `['${s.label}']`;
                    } else {
                      return `.${s.label}`;
                    }
                }
              }
              return s.label;
            })();
            completionItem.detail = s.type;
            return completionItem;
          })
        );
        Storage.cacheCompletions(completionList);
        return completionList;
      } catch (e) {}
    } catch (e) {
      console.info(e);
    }
    return [];
  },
});

export const importsCompletionProvider: () => CompletionItemProvider = () => ({
  async provideCompletionItems(document, position, _token, _context) {
    if (!Settings.autoComplete || !Settings.autoImport) {
      return;
    }
    try {
      const provider = new ProviderFactory({
        providerKind: ProviderKind.Completion,
        position,
        document,
      });
      const items = await provider.getImportCompletions();
      return items.map((c, index) => ({
        label: c.label,
        detail: `auto import ...${c.shortPath}`,
        kind: CompletionItemKind.Module,
        additionalTextEdits: c.additionalEdits,
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
});
