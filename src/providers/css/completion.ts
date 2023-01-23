import {
  CompletionItemProvider,
  TextDocument,
  Position,
  CompletionList,
} from "vscode";
import Settings from "../../settings";
import { ProviderKind } from "../types";
import { CSSProviderFactory } from "./CSSProviderFactory";

export class CssVariablesCompletion implements CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position
  ): CompletionList | undefined {
    try {
      if (!Settings.cssAutoComplete) {
        return;
      }
      const provider = new CSSProviderFactory({
        providerKind: ProviderKind.Completion,
        position,
        document,
      });

      return provider.getCssVariablesForCompletion();
    } catch (e) {}
  }
}
