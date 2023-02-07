import {
  DefinitionLink,
  Uri,
  Range,
  DefinitionProvider as vscode_DefinitionProvider,
  Definition,
  LocationLink,
  Position,
  TextDocument,
} from "vscode";
import Settings from "../../settings";
import { TSProvider } from "./TSProvider";
import { ProviderKind } from "./../types";

export class DefnitionProvider implements vscode_DefinitionProvider {
  async provideDefinition(
    document: TextDocument,
    position: Position
  ): Promise<Definition | LocationLink[]> {
    if (!Settings.definition) {
      return [];
    }
    try {
      const provider = new TSProvider({
        position,
        providerKind: ProviderKind.Definition,
        document: document,
      });
      const matchedSelector = provider.getMatchedSelector();
      if (matchedSelector && matchedSelector.selector) {
        const targetRange = new Range(
          matchedSelector.selector.range.start.line,
          matchedSelector.selector.range.start.character,
          matchedSelector.selector.range.end.line,
          matchedSelector.selector.range.end.character
        );
        const targetSelectionRange = new Range(
          matchedSelector.selector.selectionRange.start.line,
          matchedSelector.selector.selectionRange.start.character,
          matchedSelector.selector.selectionRange.end.line,
          matchedSelector.selector.selectionRange.end.character
        );
        const locationLinks: DefinitionLink = {
          originSelectionRange: provider.getOriginWordRange(),
          targetUri: Uri.file(matchedSelector.uri),
          targetRange,
          targetSelectionRange,
        };
        return [locationLinks];
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }
}
