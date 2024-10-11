import * as vscode from "vscode";
import Settings from "../../settings";
import { ProviderKind } from "../types";
import { CSSCodeLensProvider, CSSProvider } from "./CSSProvider";
import Store from "../../store/Store";

export class ReferenceCodeLens extends vscode.CodeLens {
  constructor(
    public document: vscode.TextDocument,
    public file: string,
    range: vscode.Range,
  ) {
    super(range);
  }
}

export class ReferenceCodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Promise<ReferenceCodeLens[]> {
    if (!Settings.codeLens || token.isCancellationRequested) {
      return [];
    }
    try {
      const provider = new CSSCodeLensProvider({
        providerKind: ProviderKind.CodeLens,
        document,
        position: new vscode.Position(0, 0),
      });

      return provider.provideCodeLenses();
    } catch (e: any) {
      Store.outputChannel.error(`ReferenceCodeLensProviderError: ${e.message}`);
      return [];
    }
  }

  getCommandTitle(references: vscode.Location[]) {
    return references.length > 1
      ? `${references.length} References`
      : `${references.length} Reference`;
  }

  async resolveCodeLens(codeLens: ReferenceCodeLens): Promise<vscode.CodeLens> {
    try {
      const uri = codeLens.document.uri;
      const position = codeLens.range.start;
      const provider = new CSSCodeLensProvider({
        providerKind: ProviderKind.CodeLens,
        document: codeLens.document,
        position: codeLens.range.start,
      });
      const references = await provider.resolveCodeLens(codeLens.range);
      codeLens.command = {
        title: this.getCommandTitle(references),
        command: references.length ? "editor.action.showReferences" : "",
        arguments: [uri, position, references],
      };
      return codeLens;
    } catch (e) {
      throw e;
    }
  }
}
