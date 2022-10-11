import { HoverProvider, Hover } from 'vscode';
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
					await provider.setSourceCssFileContents();
					const hoverContent = provider.getSymbolContent(matchedSelectors[0]);
					const hover = new Hover(
						hoverContent,
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