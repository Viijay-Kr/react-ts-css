import { MarkdownString, Position, Range } from 'vscode';
import Storage from '../storage/Storage';
import { extractClassName, filterChildSelector, filterParentSelector, filterSiblingSelector, filterSuffixedSelector, getSuffixesWithParent, getSymbolContent, parseCss, scssSymbolMatcher } from '../parser/css';
import { SymbolInformation } from 'vscode-css-languageservice';
import { ImportDeclaration } from '@babel/types';

export enum ProviderKind {
	Definition = 1,
	Completion = 2,
	Hover = 3,
	Invalid = -1
}

export interface CompletionItemType {
	label: string;
	type?: 'root' | 'suffix' | 'child' | 'sibling',
	content?: MarkdownString
}
export class ProviderFactory {
	/** Dynamic CSS file which should be parsed for completion,definition and hover */
	public sourceCssFile: string | undefined;
	public providerKind: ProviderKind = ProviderKind.Invalid;
	public position: Position;
	public constructor(options: { providerKind: ProviderKind, position: Position }) {
		this.providerKind = options.providerKind;
		this.position = options.position;
		this.setSourceCssFile(options.position);
	}

	/**
	 * Set the source css file for processing provider results. The file is determined by the current position in the TextDocument and finding the available css import declarations in the Document
	 * @param position [Position](#vscode.Position);
	 */
	public setSourceCssFile(position: Position) {
		const document = Storage.getActiveTextDocument();
		const nodeAtOffset = Storage.getNodeAtOffsetPosition(document.offsetAt(position));
		const nodeByFile = Storage.getNodeByFile();
		const targetIdentifier = nodeAtOffset?.parent;
		const targetImport = nodeByFile?.sourceIdentifiers?.find(s => s.identifier.name === targetIdentifier?.name)?.import;
		if (targetImport) {
			const files = Array.from(Storage.sourceFiles.keys());
			this.sourceCssFile = files.find(f => f.includes(targetImport.source.value.split('/').pop()!));
		}
	}

	public async getAllSymbols() {
		if (!this.sourceCssFile) {
			throw new Error('No source css file uri found. Did you create a ProviderFactory instance');
		}
		const symbols = Storage.getCSSSymbols(this.sourceCssFile);
		if (!symbols) {
			// If not found in cache get it from a fresh parse
			const symbols = parseCss(this.sourceCssFile);
			Storage.setCssSymbols(this.sourceCssFile, symbols);
			return symbols;
		}
		return symbols;
	}

	public async getMatchedSelectors() {
		const symbols = await this.getAllSymbols();
		const document = Storage.getActiveTextDocument();
		const nodeAtOffset = Storage.getNodeAtOffsetPosition(document.offsetAt(this.position));
		if (!nodeAtOffset?.literal.value) {
			return;
		}
		return scssSymbolMatcher(symbols, nodeAtOffset?.literal.value);
	}

	public async getSelectorsForCompletion() {
		const symbols = await this.getAllSymbols();
		const toCompletionItem = (type: CompletionItemType['type']) => (s: SymbolInformation): CompletionItemType => ({
			label: extractClassName(s),
			type,
			content: this.getSymbolContent(s),
		});
		const parentSelectors = symbols.filter(filterParentSelector).map(toCompletionItem('root'));
		const childSelectors = symbols.filter(filterChildSelector).map(toCompletionItem('child'));
		const siblingSelectots = symbols.filter(filterSiblingSelector).map(toCompletionItem('sibling'));
		const suffixedSelectors = symbols
			.filter(filterSuffixedSelector).
			map((s) => getSuffixesWithParent(symbols, s)).map(toCompletionItem('suffix'));

		return [
			...parentSelectors,
			...childSelectors,
			...siblingSelectots,
			...suffixedSelectors
		].reduce<CompletionItemType[]>((acc, prev) => {
			if (!acc.find((s) => s.label === prev.label)) {
				return acc.concat(prev);
			}
			return acc;
		}, []);
	}
	public getOriginWordRange() {
		const document = Storage.getActiveTextDocument();
		const nodeAtOffset = Storage.getNodeAtOffsetPosition(document.offsetAt(this.position));
		if (!nodeAtOffset) {
			return;
		}
		return new Range(
			new Position(
				nodeAtOffset.parent.loc?.start.line! - 1,
				nodeAtOffset.parent.loc?.start.column!
			),
			new Position(
				nodeAtOffset.literal.loc?.end.line! - 1,
				nodeAtOffset.literal.loc?.end.column!
			)
		);
	}

	public getSymbolLocationRange(symbol: SymbolInformation) {
		return new Range(
			new Position(symbol.location.range.start.line, symbol.location.range.start.character),
			new Position(symbol.location.range.end.line, symbol.location.range.end.character)
		);
	}

	public getSymbolContent(symbol: SymbolInformation) {
		if (!this.sourceCssFile) {
			throw new Error('No source css file uri found. Did you create a ProviderFactory instance');
		}
		return getSymbolContent(symbol);
	}

	public preProcessCompletions() {
		const currentRange = new Range(
			new Position(this.position.line, this.position.character),
			new Position(this.position.line, this.position.character)
		);
		const document = Storage.getActiveTextDocument();
		const nodeByFile = Storage.getNodeByFile();
		let targetDeclration: ImportDeclaration;
		nodeByFile?.sourceIdentifiers.forEach((i) => {
			if (targetDeclration) { return; }
			const identifier = i.identifier.name;
			const wordToMatch = document.getText(
				currentRange.with(
					new Position(this.position.line, this.position.character - identifier.length - 1),
					new Position(this.position.line, this.position.character - 1)
				)
			);
			const match = wordToMatch.match(new RegExp(i.identifier.name));
			if (match) {
				targetDeclration = i.import;

			}
		});
		const files = Array.from(Storage.sourceFiles.keys());
		this.sourceCssFile = files.find(f => {
			return f.includes(targetDeclration?.source.value.split('/').pop()!);
		});
	}
}