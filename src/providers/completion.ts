import { CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Range, Position, TextEdit, CompletionTriggerKind } from 'vscode';
import Settings from '../settings';
import Storage from '../storage/Storage';
import { ProviderFactory, ProviderKind } from './ProviderFactory';
import { ProviderParams } from './types';


export const completetionProvider: (params: ProviderParams) => CompletionItemProvider = () => ({
	async provideCompletionItems(_, position, _token, _context) {
		if (!Settings.autoComplete) {
			return;
		}
		try {
			if (_context.triggerKind !== CompletionTriggerKind.TriggerCharacter || _token.isCancellationRequested) {
				return; // Storage.getCompletionsFromCache();
			}
			try {
				const provider = new ProviderFactory({
					providerKind: ProviderKind.Completion,
					position,
				});
				provider.preProcessCompletions();
				const allSelectors = await provider.getSelectorsForCompletion();

				const completionList = new CompletionList(
					allSelectors.map((s) => {
						const completionItem = new CompletionItem(s.label, CompletionItemKind.Value);
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
						completionItem.detail = s.type;
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