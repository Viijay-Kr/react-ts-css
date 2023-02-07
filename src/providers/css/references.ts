import * as vscode from "vscode";
import Settings from "../../settings";
import Store from "../../store/Store";
import { ProviderKind } from "../types";
import { CSSProvider } from "./CSSProvider";

export class ReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Location[]> {
    if (!Settings.references) {
      return [];
    }
    try {
      const provider = new CSSProvider({
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
