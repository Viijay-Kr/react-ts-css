import { DefinitionProvider, Location, Position, Range, Uri } from 'vscode';
import { parseScss, scssSymbolMatcher } from '../parser/scss';
import { parseTsx } from '../parser/tsx';
import * as fs from 'fs/promises';
import { Decoration } from '../decoration/decoration';
interface ProviderParams {
	files: string[];
}

const decoration = new Decoration();

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
						const locations: Location[] = [];
						matchedSelectors.forEach(symbol => {
							if (symbol) {
								const location = new Location(Uri.file(targetFile), new Range(
									new Position(symbol.location.range.start.line, symbol.location.range.start.character),
									new Position(symbol.location.range.end.line, symbol.location.range.end.character)
								));
								decoration.addDecoration(
									new Position(node.targetIdentifier.loc?.start.line!, node.targetIdentifier.loc?.start.column!),
									new Position(node.targetLiteral.loc?.end.line!, node.targetLiteral.loc?.end.column!)
								);
								locations.push(location);
							}
						});
						return locations;
					}
				}

			}
			return [];
		} catch (e) {
			throw e;
		}
	},
});

