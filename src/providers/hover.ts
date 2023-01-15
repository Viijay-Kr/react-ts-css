import path = require("path");
import { HoverProvider, Hover, MarkdownString } from "vscode";
import Settings from "../settings";
import Storage_v2 from "../storage/Storage_v2";
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
        const matchedSelector = provider.getMatchedSelector();
        if (matchedSelector && matchedSelector.selector) {
          const target = matchedSelector.selector;
          // const { content, language } =
          //   provider.getSymbolContentForHover(target);
          const content = target.content;
          const language = path.extname(matchedSelector.uri).replace(".", "");
          const filePath = path.relative(
            Storage_v2.workSpaceRoot ?? "",
            matchedSelector.uri
          );
          const linenum = target.range.start.line + 1;
          const charnum = target.range.start.character;
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
