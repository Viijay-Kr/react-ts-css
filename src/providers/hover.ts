import path = require("path");
import {
  HoverProvider as vscode_HoverProvider,
  Hover,
  MarkdownString,
  Position,
  TextDocument,
} from "vscode";
import Settings from "../settings";
import Storage_v2 from "../storage/Storage_v2";
import { ProviderFactory, ProviderKind } from "./ProviderFactory";

export class HoverProvider implements vscode_HoverProvider {
  async provideHover(
    document: TextDocument,
    position: Position
  ): Promise<Hover | undefined> {
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
  }
}
