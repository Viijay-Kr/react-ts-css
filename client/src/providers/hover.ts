import { HoverProvider, Hover, Position, } from 'vscode';
import { getSymbolContent, parseScss, scssSymbolMatcher } from '../parser/scss';
import { parseTsx } from '../parser/tsx';
import * as fs from 'fs/promises';
import { Decoration } from '../decoration/decoration';

interface HoverParams {
	files: string[];
}

const decoration = new Decoration();

export const hoverProvider: (params: HoverParams) => HoverProvider = (params) => {
	return {
		async provideHover(document, position) {
			try {
				const node = await parseTsx(document.getText(), document.offsetAt(position));
				if (node && node.targetIdentifier && node.targetLiteral) {
					const targetImport = node.sourceIdentifiers.find(i => i.identifier.name === node.targetIdentifier.name)?.import;
					if (targetImport) {
						const targetFile = params.files.find(f => {
							return f.includes(targetImport.source.value.split('/').pop()!);
						});
						if (targetFile) {
							const content = await fs.readFile(targetFile);
							const symbols = parseScss(targetFile, content.toString());
							const matchedSelectors = scssSymbolMatcher(symbols, node.targetLiteral.value);
							const symbol = matchedSelectors[0];
							if (symbol) {
								const hover = new Hover(getSymbolContent(symbol, content.toString()));
								decoration.addDecoration(
									new Position(node.targetIdentifier.loc?.start.line! - 1, node.targetIdentifier.loc?.start.column!),
									new Position(node.targetLiteral.loc?.end.line! - 1, node.targetLiteral.loc?.end.column!)
								);
								return hover;
							}
						}
					}
				} else {
					decoration.removeDecoration();
				}
				return undefined;
			} catch (e) {
				throw e;
			}
		},
	};
};