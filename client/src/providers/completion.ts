import { CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Range, Position, TextEdit, MarkdownString } from 'vscode';
import { ParserFactory } from '../parser/ParserFactory';
interface CompletionParams {
	files: string[]
}
export const completetionProvider: (params: CompletionParams) => CompletionItemProvider = (params) => ({
	async provideCompletionItems(document, position, _token, _context) {
		try {
			const parser = new ParserFactory(params.files, document, position, 'Completion');
			parser.ParseTsx().then();
			if (!parser.targetFile) {
				return;
			}
			await parser.ParseCSS();
			const { parentSelectors } = parser.getAllSelectors();
			const uniqueSelectors: Array<{
				label: string;
				details?: string;
				content?: MarkdownString;
			}> = [];
			parentSelectors.forEach(s => {
				const symbolName = s.name.replace(/^./g, '');
				if (!uniqueSelectors.find(sy => sy.label === symbolName)) {
					uniqueSelectors.push({
						label: symbolName,
						content: parser.SymbolContent(s)
					});
				}
			});
			const completionList = new CompletionList(
				uniqueSelectors.map((s) => {
					const completionItem = new CompletionItem(s.label, CompletionItemKind.Property);
					completionItem.insertText = `['${s.label}']`;
					// const range = parser.getCompletionItemRange();
					completionItem.additionalTextEdits = [new TextEdit(new Range(
						new Position(position.line, position.character - 1),
						new Position(position.line, position.character)
					), '')];
					completionItem.preselect = true;
					completionItem.documentation = s.content;
					return completionItem;
				})
			);
			return Promise.resolve(completionList);
		} catch (e) {
			console.info(e);
		}
		return [];
	},
});