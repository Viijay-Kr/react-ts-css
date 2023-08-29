import path = require("path");
import {
  HoverProvider as vscode_HoverProvider,
  Hover,
  MarkdownString,
  Position,
  TextDocument,
} from "vscode";
import Settings from "../../settings";
import Store from "../../store/Store";
import { ProviderKind } from "../types";
import { TSProvider } from "./TSProvider";

export class HoverProvider implements vscode_HoverProvider {
  async provideHover(
    document: TextDocument,
    position: Position
  ): Promise<Hover | undefined> {
    if (!Settings.peekProperties) {
      return;
    }
    try {
      const provider = new TSProvider({
        position,
        providerKind: ProviderKind.Hover,
        document: document,
      });
      const matchedSelector = await provider.getMatchedSelector();
      if (matchedSelector && matchedSelector.selector) {
        const target = matchedSelector.selector;
        // const { content, language } =
        //   provider.getSymbolContentForHover(target);
        const content = target.content;
        const language = path.extname(matchedSelector.uri).replace(".", "");
        const filePath = path.relative(
          Store.workSpaceRoot ?? "",
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
