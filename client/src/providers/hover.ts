import { HoverProvider, Hover, MarkdownString } from 'vscode';
import Storage from '../storage/Storage';
import { ProviderFactory, ProviderKind } from './ProviderFactory';
interface HoverParams {
	files: string[];
}


export const hoverProvider: (params: HoverParams) => HoverProvider = () => {
	return {
		async provideHover(_, position) {
			try {
				const provider = new ProviderFactory({
					position,
					providerKind: ProviderKind.Hover
				});
				const matchedSelectors = await provider.getMatchedSelectors();
				if (matchedSelectors?.length) {
					const target = matchedSelectors[0];
					const hoverContent = provider.getSymbolContent(target);
					const filePath = target.location.uri.replace(Storage.workSpaceRoot ?? '', '').replace(/^\//g, '');
					const linenum = target.location.range.start.line + 1;
					const charnum = target.location.range.start.character;
					const hover = new Hover(
						[
							new MarkdownString(`*_${filePath}:${linenum},${charnum}_*`),
							hoverContent
						],
						provider.getOriginWordRange(),
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