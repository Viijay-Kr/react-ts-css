import { DefinitionProvider, Location, Position, Range, Uri } from 'vscode';
import { parseScss, scssSymbolMatcher } from '../parser/css';
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
						const symbol = scssSymbolMatcher(symbols, node.targetLiteral.value);
						if (symbol) {
							const location = new Location(Uri.file(targetFile), new Range(
								new Position(symbol.location.range.start.line, symbol.location.range.start.character),
								new Position(symbol.location.range.end.line, symbol.location.range.end.character)
							));
							// const start = node.targetIdentifier.loc?.start;
							// const end = node.targetLiteral.loc?.end;
							return location;
						}
					}
				}

			}
			return [];
		} catch (e) {
			throw e;
		}
	},
});

