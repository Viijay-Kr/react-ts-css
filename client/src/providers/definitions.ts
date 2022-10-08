import { DefinitionLink, DefinitionProvider, Position, Range, Uri } from 'vscode';
import { parseScss, scssSymbolMatcher } from '../parser/scss';
import { parseTsx } from '../parser/tsx';
import * as fs from 'fs/promises';
interface ProviderParams {
	files: string[];
}


export const definitionProvider: (params: ProviderParams) => DefinitionProvider = (params) => ({
	async provideDefinition(document, position) {
		try {
			const node = await parseTsx(document.getText(), document.offsetAt(position));
			if (node) {
				const targetImport = node.sourceIdentifiers.find(i => i.identifier.name === node.targetIdentifier.name)?.import;
				if (targetImport) {
					const targetFile = params.files.find(f => {
						return f.includes(targetImport.source.value.split('/').pop()!);
					});
					// eslint-disable-next-line no-console
					if (targetFile) {
						const content = await fs.readFile(targetFile);
						const symbols = parseScss(targetFile, content.toString());
						const matchedSelectors = scssSymbolMatcher(symbols, node.targetLiteral.value);
						let locationLinks: DefinitionLink[] = [];
						const originSelectionRange = new Range(
							new Position(node.targetIdentifier.loc?.start.line! - 1, node.targetIdentifier.loc?.start.column!),
							new Position(node.targetLiteral.loc?.end.line! - 1, node.targetLiteral.loc?.end.column!)
						);
						const symbol = matchedSelectors[0];
						if (symbol) {
							const targetUri = Uri.file(targetFile);
							const targetRange = new Range(
								new Position(symbol.location.range.start.line, symbol.location.range.start.character),
								new Position(symbol.location.range.end.line, symbol.location.range.end.character)
							);

							locationLinks.push({
								originSelectionRange,
								targetUri,
								targetSelectionRange: targetRange,
								targetRange
							});
						}
						return locationLinks;
					}
				}

			}
			return [];
		} catch (e) {
			throw e;
		}
	},
});

