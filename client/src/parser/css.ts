import { MarkdownString } from 'vscode';
import { getCSSLanguageService, getSCSSLanguageService, SymbolInformation, TextDocument } from 'vscode-css-languageservice';

const scssLs = getSCSSLanguageService();
const cssLs = getCSSLanguageService();

export const parseScss = (uri: string, content: string) => {
	const document = TextDocument.create(uri, 'scss', 1, content);
	const ast = scssLs.parseStylesheet(document);
	const symbols = scssLs.findDocumentSymbols(document, ast);
	return symbols;
};

export const fileExt = (uri: string) => {
	if (uri.endsWith('.css')) { return 'css'; }
	if (uri.endsWith('.scss')) { return 'scss'; }
	return 'css';
};

export const parseCss = (uri: string, content: string) => {
	const languageId = fileExt(uri);
	const document = TextDocument.create(
		uri,
		languageId,
		1,
		content
	);
	const ast = (() => {
		if (languageId === 'css') {
			return cssLs.parseStylesheet(document);
		}
		if (languageId === 'scss') {
			return scssLs.parseStylesheet(document);
		}
		return cssLs.parseStylesheet(document);
	})();
	const symbols = cssLs.findDocumentSymbols(document, ast);
	return symbols;
};

export const scssSymbolMatcher = (symbols: SymbolInformation[], target: string) => {
	const allSelectors = symbols.filter(filterAllSelector);
	const suffixSelectors = symbols.filter(filterSuffixedSelector);
	const childSelectors = symbols.filter(filterChildSelector);
	const siblingsSelectors = symbols.filter(filterSiblingSelector);

	const finalSelectors = [
		...allSelectors,
		...childSelectors,
		...siblingsSelectors,
	].filter(s => extractClassName(s) === target);

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

	if (finalSelectors.length) { return finalSelectors; }
	if (suffixSelector) { return [suffixSelector]; }
	return [];
};

export const getSymbolContent = (symbol: SymbolInformation, fileContent: string) => {
	const document = TextDocument.create(symbol.location.uri, 'scss', 1, fileContent);
	const symbolContent = document.getText(symbol.location.range);
	return new MarkdownString('', true).appendCodeblock(symbolContent, 'sass');
};

// This helper assumes the symbol you are trying to parse is a scss symbol
export const getSuffixesWithParent = (symbols: SymbolInformation[], sourceContent: string, suffix: SymbolInformation) => {
	let newSuffix = {
		...suffix,
	};
	symbols.filter(filterAllSelector).forEach((s) => {
		const content = getSymbolContent(s, sourceContent);
		const document = TextDocument.create(s.location.uri, 'scss', 1, content.value);
		const ast = scssLs.parseStylesheet(document);
		const symbols = scssLs.findDocumentSymbols(document, ast);
		const match = symbols.find(sy => sy.name === suffix.name);
		if (match) {
			newSuffix.name = (s.name + suffix.name).replace('&', '');
		}
	});
	return newSuffix;
};
export const filterAllSelector = (s: SymbolInformation) => s.kind === 5 && s.name.replace(/^&/g, '').startsWith('.');

export const filterSuffixedSelector = (s: SymbolInformation) => s.kind === 5 && s.name.replace(/^&/g, '').match(/^-|^[__]|^[--]/g);

export const filterChildSelector = (s: SymbolInformation) => s.kind === 5 && s.name.startsWith('& .');


export const filterSiblingSelector = (s: SymbolInformation) => s.kind === 5 && s.name.startsWith('&.');

export const filterParentSelector = (s: SymbolInformation) => s.kind === 5 && s.name.startsWith('.');

export const extractClassName = (s: SymbolInformation) => s.name.replace(/^(?:\&\s*\.)|^(?:\.)/g, '');