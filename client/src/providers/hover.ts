import { HoverProvider, Hover } from 'vscode';
import { ParserFactory } from '../parser/ParserFactory';

interface HoverParams {
	files: string[];
}


export const hoverProvider: (params: HoverParams) => HoverProvider = (params) => {
	return {
		async provideHover(document, position) {
			try {
				const parser = new ParserFactory(params.files, document, position, 'Hover');
				await parser.ParseTsx();
				await parser.ParseCSS();
				const matchedSelectors = parser.SymbolsMatcher();
				if (matchedSelectors.length) {
					const hoverContent = parser.SymbolContent(matchedSelectors[0]);
					const hover = new Hover(
						hoverContent,
						parser.getOriginWordRange(),
					);
					return hover;
				}
				return undefined;
			} catch (e) {
				throw e;
			}
		},
	};
};