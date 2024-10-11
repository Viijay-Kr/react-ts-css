import {
  CancellationToken,
  Position,
  ProviderResult,
  Range,
  RenameProvider,
  TextDocument,
  TextEdit,
  WorkspaceEdit,
} from "vscode";
import Settings from "../../settings";
import { CSSProvider, CSSRenameProvider } from "./CSSProvider";
import { ProviderKind } from "../types";
import { isSuffix, stripSelectHelpers } from "../../parser/utils";
import Store from "../../store/Store";
export class RenameSelectorProvider implements RenameProvider {
  async provideRenameEdits(
    document: TextDocument,
    position: Position,
    newName: string,
    token: CancellationToken,
  ): Promise<WorkspaceEdit | undefined | null> {
    if (!Settings.renameSelector || token.isCancellationRequested) {
      return;
    }
    const provider = new CSSRenameProvider({
      providerKind: ProviderKind.RenameSelector,
      document,
      position,
    });
    const edits = new WorkspaceEdit();

    let range = await provider.getSelectorRange();
    const locations = await provider.provideRenameReferences(newName);
    if (range) {
      edits.set(document.uri, [new TextEdit(range, newName)]);
    }
    for (const loc of locations) {
      edits.set(loc.uri, [new TextEdit(loc.range, loc.text)]);
    }
    return edits;
  }
  async prepareRename?(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
  ): Promise<Range | { range: Range; placeholder: string } | null | undefined> {
    if (!Settings.renameSelector || token.isCancellationRequested) {
      return;
    }
    try {
      const provider = new CSSRenameProvider({
        providerKind: ProviderKind.RenameSelector,
        document,
        position,
      });
      const range = await provider.getSelectorRange();
      return range;
    } catch (e: any) {
      Store.outputChannel.error(
        `RenameSelectorProviderError: Failed in document '${document}' at '${position.line}:${position.character}' 
         ${e.message}`,
      );
      return;
    }
  }
}
