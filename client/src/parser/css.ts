import { getSCSSLanguageService, SymbolInformation, TextDocument } from 'vscode-css-languageservice';

const ls = getSCSSLanguageService();

export const parseScss = (uri: string, content: string) => {
	const document = TextDocument.create(uri, 'scss', 1, content);
	const ast = ls.parseStylesheet(document);
	const symbols = ls.findDocumentSymbols(document, ast);
	return symbols;
};

export const scssSymbolMatcher = (symbols: SymbolInformation[], target: string) => {
	const parentSelectors = symbols.filter(s => s.kind === 5 && s.name.startsWith('.'));
	const suffixSelectors = symbols.filter(s => s.kind === 5 && s.name.replace(/^&/g, '').match(/^-|^[__]|^[--]/g));

	return parentSelectors.find(s => s.name.replace(/^./g, '') === target)
		|| suffixSelectors[(() => {
			let prevMatchIndex = -1;
			let symbolIndex = -1;
			suffixSelectors.forEach((s, i) => {
				const suffix = s.name.replace(/^(.*?)&/g, '');
				const match = target.match(suffix)?.index;
				if (typeof match !== 'undefined') {
					if (prevMatchIndex === -1) { prevMatchIndex = match; symbolIndex = i; }
					if (match < prevMatchIndex) {
						prevMatchIndex = match;
						symbolIndex = i;
					}
				}
			});
			return symbolIndex;
		})()];
};