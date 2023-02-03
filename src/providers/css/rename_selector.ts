import * as vscode from "vscode";
import { ProviderKind } from "../types";
import { CSSProviderFactory } from "./CSSProviderFactory";

/**
 * @class RenameSelectorProvider
 * This provider is still not production ready. So don't use
 */
export class RenameSelectorProvider implements vscode.RenameProvider {
  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.WorkspaceEdit> {
    try {
      if (token.isCancellationRequested) {
        return;
      }
      const edits = new vscode.WorkspaceEdit();
      const provider = new CSSProviderFactory({
        document,
        position,
        providerKind: ProviderKind.RenameSelector,
      });
      const references = provider.getReferences({ valueOnly: true });
      for (const reference of references) {
        const edit = vscode.TextEdit.replace(
          reference.range,
          newName.replace(".", "")
        );
        edits.set(reference.uri, [edit]);
      }
      return edits;
    } catch (e) {
      return;
    }
  }
}
