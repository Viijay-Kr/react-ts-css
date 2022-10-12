import { CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Range, Position, TextEdit, MarkdownString, CompletionTriggerKind } from 'vscode';
import { extractClassName } from '../parser/css';
import Storage from '../storage/Storage';
import { ProviderFactory, ProviderKind } from './ProviderFactory';
interface CompletionParams {
	files: string[]
}
export const completetionProvider: (params: CompletionParams) => CompletionItemProvider = () => ({
	async provideCompletionItems(_, position, _token, _context) {
		try {
			if (_context.triggerKind !== CompletionTriggerKind.TriggerCharacter || _token.isCancellationRequested) {
				return Storage.getCompletionsFromCache();
			}
			try {
				const provider = new ProviderFactory({
					providerKind: ProviderKind.Completion,
					position,
				});
				provider.preProcessCompletions();
				const { parentSelectors, childSelectors } = await provider.getAllSelectors();
				const uniqueSelectors: Array<{
					label: string;
					details?: string;
					content?: MarkdownString;
				}> = [];
				[...parentSelectors, ...childSelectors].forEach(async s => {
					const symbolName = extractClassName(s);
					if (!uniqueSelectors.find(sy => sy.label === symbolName)) {
						uniqueSelectors.push({
							label: symbolName,
							content: provider.getSymbolContent(s)
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
							completionItem.documentation = s.content;
							return s.label;
						})();
						return completionItem;
					})
				);
				Storage.cacheCompletions(completionList);
				return completionList;
			} catch (e) {
			}
		} catch (e) {
			console.info(e);
		}
		return [];
	},
});