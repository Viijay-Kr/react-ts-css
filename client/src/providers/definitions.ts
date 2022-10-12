import { DefinitionLink, DefinitionProvider, Uri } from 'vscode';
import { ProviderFactory, ProviderKind } from './ProviderFactory';
interface ProviderParams {
	files: string[];
}


export const definitionProvider: (params: ProviderParams) => DefinitionProvider = () => ({
	async provideDefinition(_, position) {
		try {
			const provider = new ProviderFactory({
				position,
				providerKind: ProviderKind.Definition
			});
			const matchedSelectors = await provider.getMatchedSelectors();
			if (matchedSelectors?.length) {
				const locationLinks: DefinitionLink = {
					originSelectionRange: provider.getOriginWordRange(),
					targetUri: Uri.file(matchedSelectors[0].location.uri || ''),
					targetSelectionRange: provider.getSymbolLocationRange(matchedSelectors[0]),
					targetRange: provider.getSymbolLocationRange(matchedSelectors[0]),
				};
				return [locationLinks];
			}
			return [];
		} catch (e) {
			throw e;
		}
	},
});

