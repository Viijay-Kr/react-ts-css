import {
  CompletionItemProvider,
  TextDocument,
  Position,
  CompletionList,
} from "vscode";
import Settings from "../../settings";
import { ProviderKind } from "../types";
import { CSSProvider } from "./CSSProvider";

export class CssVariablesCompletion implements CompletionItemProvider {
  async provideCompletionItems(
    document: TextDocument,
    position: Position
  ): Promise<CompletionList<import("vscode").CompletionItem> | undefined> {
    try {
      if (!Settings.cssAutoComplete) {
        return;
      }
      const provider = new CSSProvider({
        providerKind: ProviderKind.Completion,
        position,
        document,
      });

      return await provider.getCssVariablesForCompletion();
    } catch (e) {}
  }
}
