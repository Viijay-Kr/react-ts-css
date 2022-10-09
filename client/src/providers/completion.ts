import { CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Range, Position, TextEdit, MarkdownString, CompletionTriggerKind } from 'vscode';
import { ParserFactory } from '../parser/ParserFactory';
interface CompletionParams {
	files: string[]
}
export const completetionProvider: (params: CompletionParams) => CompletionItemProvider = (params) => ({
	async provideCompletionItems(document, position, _token, _context) {
		try {
			if (_context.triggerKind === CompletionTriggerKind.Invoke) {
				return;
			}
			return new Promise(async (resolve, reject) => {
				try {
					const parser = new ParserFactory(params.files, document, position, 'Completion');
					await parser.preProcessCompletions();
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
							const triggerKind = _context.triggerKind;
							const triggerCharacter = _context.triggerCharacter;
							completionItem.insertText = (() => {
								if (triggerKind === CompletionTriggerKind.TriggerCharacter) {
									switch (triggerCharacter) {
										case '\[':
											return `'${s.label}'`;
										case '\'':
											return s.label;
										case '.':
											completionItem.additionalTextEdits = [new TextEdit(new Range(
												new Position(position.line, position.character - 1),
												new Position(position.line, position.character)
											), '')];
											return `['${s.label}']`;
									}
								}
								
								return s.label;
							})();
							completionItem.preselect = true;
							return completionItem;
						})
					);
					resolve(completionList);
				} catch (e) {
					reject(e);
				}
			});
		} catch (e) {
			console.info(e);
		}
		return [];
	},
});