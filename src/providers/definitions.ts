import { DefinitionLink, DefinitionProvider, Uri } from "vscode";
import Settings from "../settings";
import { ProviderFactory, ProviderKind } from "./ProviderFactory";
import { ProviderParams } from "./types";

export const definitionProvider: (
  params: ProviderParams
) => DefinitionProvider = () => ({
  async provideDefinition(document, position) {
    if (!Settings.definition) {
      return [];
    }
    try {
      const provider = new ProviderFactory({
        position,
        providerKind: ProviderKind.Definition,
        document: document,
      });
      const matchedSelectors = await provider.getMatchedSelectors();
      if (matchedSelectors?.length) {
        const locationLinks: DefinitionLink = {
          originSelectionRange: provider.getOriginWordRange(),
          targetUri: Uri.file(matchedSelectors[0].location.uri || ""),
          // targetSelectionRange: provider.getSymbolLocationRange(matchedSelectors[0]),
          targetRange: provider.getSymbolLocationRange(matchedSelectors[0]),
        };
        return [locationLinks];
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
    return [];
  },
});
