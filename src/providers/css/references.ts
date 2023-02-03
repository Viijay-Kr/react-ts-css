import * as vscode from "vscode";
import Settings from "../../settings";
import Store from "../../store/Store";
import { ProviderKind } from "../types";
import { CSSProviderFactory } from "./CSSProviderFactory";

export class ReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Location[]> {
    if (!Settings.references) {
      return [];
    }
    try {
      const provider = new CSSProviderFactory({
        document,
        position,
        providerKind: ProviderKind.References,
      });
      return provider.provideReferences();
    } catch (e) {
      return [];
    }
  }
}
