import { MarkdownString } from 'vscode';
import { getSCSSLanguageService, SymbolInformation, TextDocument } from 'vscode-css-languageservice';

const ls = getSCSSLanguageService();

export const parseScss = (uri: string, content: string) => {
	const document = TextDocument.create(uri, 'scss', 1, content);
	const ast = ls.parseStylesheet(document);
	const symbols = ls.findDocumentSymbols(document, ast);
	return symbols;
};

export const filterAllSelector = (s: SymbolInformation) => s.kind === 5 && s.name.replace(/^&/g, '').startsWith('.');

export const filterSuffixedSelector = (s: SymbolInformation) => s.kind === 5 && s.name.replace(/^&/g, '').match(/^-|^[__]|^[--]/g);

export const filterChildSelector = (s: SymbolInformation) => s.kind === 5 && s.name.startsWith('&');

export const filterParentSelector = (s: SymbolInformation) => s.kind === 5 && s.name.startsWith('.');

export const scssSymbolMatcher = (symbols: SymbolInformation[], target: string) => {
	const allSelectors = symbols.filter(filterAllSelector);
	const suffixSelectors = symbols.filter(filterSuffixedSelector);

	const normalSelectors = allSelectors.filter(s => s.name.replace(/^(?:\&\.)|^(?:\.)/g, '') === target);
	const suffixSelector = suffixSelectors[(() => {
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

	if (normalSelectors.length) { return normalSelectors; }
	if (suffixSelector) { return [suffixSelector]; }
	return [];
};

export const getSymbolContent = (symbol: SymbolInformation, fileContent: string) => {
	const document = TextDocument.create(symbol.location.uri, 'scss', 1, fileContent);
	const symbolContent = document.getText(symbol.location.range);
	return new MarkdownString('', true).appendCodeblock(symbolContent, 'sass');
};