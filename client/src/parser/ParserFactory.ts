import { Identifier, StringLiteral } from '@babel/types';
import { Position, TextDocument, Range } from 'vscode';
import { filterChildSelector, getSymbolContent, parseScss, filterParentSelector, scssSymbolMatcher } from './scss';
import { parseTsx, SourceIdentifier } from './tsx';
import * as fs from 'fs/promises';
import { SymbolInformation } from 'vscode-css-languageservice';

interface ParsedNode {
	targetIdentifier?: Identifier;
	targetLiteral?: StringLiteral;
	sourceIdentifiers: SourceIdentifier[];
	completionIdentifier?: Identifier;
}
interface IParserFactoryMethods {
	ParseCSS: () => Promise<void>
	SymbolsMatcher: () => SymbolInformation[]
}

class SymbolsNotFoundError extends Error {
	constructor() {
		super('Symbols Not found. Did you parse the source CSS file');
	}
}
class NodeNotFoundError extends Error {
	constructor() {
		super('Parsed node not found. Did you parse the source TSX file');
	}
}

class SourceCSSNotFoundError extends Error {
	constructor() {
		super('No CSS content found. Did you parse your source CSS file');
	}
}

class CssFileNotFoundError extends Error {
	constructor() {
		super('Target CSS File not Found');
	}
}
export class ParserFactory implements IParserFactoryMethods {
	private readonly files: string[];
	private readonly document: TextDocument;
	private readonly position: Position;
	public parsedNode: ParsedNode | undefined;
	public symbols: SymbolInformation[] | undefined;
	private sourceCssContent: string | undefined;
	private _targetFile: string | undefined;
	private providerKind: 'Hover' | 'Definition' | 'Completion';
	public get targetFile(): string | undefined {
		return this._targetFile;
	}

	public set targetFile(v: string | undefined) {
		this._targetFile = v;
	}

	public constructor(files: string[], document: TextDocument, position: Position, provider: 'Hover' | 'Definition' | 'Completion') {
		this.files = files;
		this.document = document;
		this.position = position;
		this.providerKind = provider;
	}

	public async ParseTsx() {
		this.parsedNode = await parseTsx(
			this.document.getText(),
			this.document.offsetAt(this.position)
		);
		if (!this.parsedNode) {
			throw new NodeNotFoundError();
		}
		const identifierToMatch = (() => {
			return this.parsedNode.targetIdentifier;
		})();
		const targetImport = this.parsedNode.sourceIdentifiers.find(i => i.identifier.name === identifierToMatch?.name)?.import;
		if (targetImport) {
			const targetFile = this.files.find(f => {
				return f.includes(targetImport.source.value.split('/').pop()!);
			});
			this.targetFile = targetFile;
		}
	}
	public async ParseCSS() {
		if (!this.parsedNode) {
			throw new NodeNotFoundError();
		}
		if (!this.targetFile) {
			throw new CssFileNotFoundError();
		}
		const content = await fs.readFile(this.targetFile);
		this.sourceCssContent = content.toString();
		const symbols = parseScss(this.targetFile, this.sourceCssContent);
		this.symbols = symbols;
	}
	public SymbolsMatcher() {
		if (!this.parsedNode) {
			throw new NodeNotFoundError();
		}
		if (!this.symbols) {
			throw new SymbolsNotFoundError();
		}
		if (!this.sourceCssContent) {
			throw new SourceCSSNotFoundError();
		}
		return scssSymbolMatcher(this.symbols, this.parsedNode.targetLiteral?.value!);
	}

	public SymbolContent(symbol: SymbolInformation) {
		if (!this.sourceCssContent) {
			throw new SourceCSSNotFoundError();
		}
		return getSymbolContent(symbol, this.sourceCssContent!);
	}

	public getOriginWordRange() {
		if (!this.parsedNode) {
			throw new NodeNotFoundError();
		}
		switch (this.providerKind) {

			default:
				return new Range(
					new Position(
						this.parsedNode.targetIdentifier!.loc?.start.line! - 1,
						this.parsedNode.targetIdentifier!.loc?.start.column!
					),
					new Position(
						this.parsedNode.targetLiteral!.loc?.end.line! - 1,
						this.parsedNode.targetLiteral!.loc?.end.column!
					)

				);
		}

	}

	public getSymbolLocationRange(symbol: SymbolInformation) {
		return new Range(
			new Position(symbol.location.range.start.line, symbol.location.range.start.character),
			new Position(symbol.location.range.end.line, symbol.location.range.end.character)
		);
	}

	public getAllSelectors() {
		if (!this.symbols) {
			throw new SymbolsNotFoundError();
		}
		const parentSelectors = this.symbols.filter(filterParentSelector);
		const childSelectors = parentSelectors.filter(filterChildSelector);
		return {
			parentSelectors,
			childSelectors,
		};
	}

	public getCompletionIdentifier() {
		if (!this.parsedNode) {
			throw new NodeNotFoundError();
		}
		return this.parsedNode.completionIdentifier?.name;
	}

	public processCompletions() {

	}
}