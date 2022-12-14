import { HoverProvider, Hover, MarkdownString } from "vscode";
import Settings from "../settings";
import Storage from "../storage/Storage";
import { ProviderFactory, ProviderKind } from "./ProviderFactory";
import { ProviderParams } from "./types";

export const hoverProvider: (params: ProviderParams) => HoverProvider = () => {
  return {
    async provideHover(document, position) {
      if (!Settings.peek) {
        return;
      }
      try {
        const provider = new ProviderFactory({
          position,
          providerKind: ProviderKind.Hover,
          document: document,
        });
        const matchedSelectors = await provider.getMatchedSelectors();
        if (matchedSelectors?.length) {
          const target = matchedSelectors[0];
          const { content, language } =
            provider.getSymbolContentForHover(target);
          const filePath = target.location.uri
            .replace(Storage.workSpaceRoot ?? "", "")
            .replace(/^\//g, "");
          const linenum = target.location.range.start.line + 1;
          const charnum = target.location.range.start.character;
          const hover = new Hover(
            [
              new MarkdownString(`*_${filePath}:${linenum},${charnum}_*`),
              `\`\`\`${language} \n${content}\n\`\`\``,
            ],
            provider.getOriginWordRange()
          );
          return hover;
        }
        return;
      } catch (e) {
        console.error(e);
        return;
      }
    },
  };
};
