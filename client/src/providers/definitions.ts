import { DefinitionLink, DefinitionProvider, Uri } from 'vscode';
import { ParserFactory } from '../parser/ParserFactory';
interface ProviderParams {
	files: string[];
}


export const definitionProvider: (params: ProviderParams) => DefinitionProvider = (params) => ({
	async provideDefinition(document, position) {
		try {
			const parser = new ParserFactory(params.files, document, position, 'Definition');
			await parser.ParseTsx();
			await parser.ParseCSS();
			const matchedSelectors = parser.SymbolsMatcher();
			if (matchedSelectors.length) {
				const locationLinks: DefinitionLink = {
					originSelectionRange: parser.getOriginWordRange(),
					targetUri: Uri.file(parser.targetFile || ''),
					targetSelectionRange: parser.getSymbolLocationRange(matchedSelectors[0]),
					targetRange: parser.getSymbolLocationRange(matchedSelectors[0]),
				};
				return [locationLinks];
			}
			return [];
		} catch (e) {
			throw e;
		}
	},
});

