import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionList,
  Range,
  Position,
  TextEdit,
  CompletionTriggerKind,
  CancellationToken,
  CompletionContext,
  ProviderResult,
  TextDocument,
} from "vscode";
import Settings from "../../settings";
import { ProviderKind } from "../types";
import { TSProvider } from "./TSProvider";

export class SelectorsCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(
    document: TextDocument,
    position: Position,
    _token: CancellationToken,
    _context: CompletionContext
  ): Promise<
    CompletionItem[] | CompletionList<CompletionItem> | null | undefined
  > {
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
      const toCompletionItem = (s: { label: string }) => {
        const completionItem = new CompletionItem(
          s.label,
          CompletionItemKind.Keyword
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
        // completionItem.detail = s.type;
        return completionItem;
      };
      try {
        const provider = new TSProvider({
          providerKind: ProviderKind.Completion,
          position,
          document,
        });
        // provider.preProcessSelectorCompletions();
        const selectors = await provider.getSelectorsForCompletion();
        if (selectors) {
          const completionList = new CompletionList(
            Array.from(selectors.keys()).map((key) =>
              toCompletionItem({ label: key })
            )
          );
          return completionList;
        }
      } catch (e) {}
    } catch (e) {
      console.info(e);
    }
    return [];
  }
}

export class ImportCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(document: TextDocument, position: Position) {
    if (!Settings.autoComplete || !Settings.autoImport) {
      return;
    }
    try {
      const provider = new TSProvider({
        providerKind: ProviderKind.Completion,
        position,
        document,
      });
      const items = await provider.getImportForCompletions();
      return new CompletionList(
        items.map((c, index) => ({
          label: c.label,
          detail: `auto import from ./${c.shortPath}`,
          kind: CompletionItemKind.Module,
          additionalTextEdits: c.additionalEdits,
        }))
      );
    } catch (e) {
      console.error(e);
      return;
    }
  }
}
