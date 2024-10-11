import * as vscode from "vscode";
import Settings from "../../settings";
import { ProviderKind } from "../types";
import { CSSDefinitionProvider, CSSProvider } from "./CSSProvider";

export class CssDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.LocationLink[]> {
    if (!Settings.cssDefinitions) {
      return [];
    }
    const provider = new CSSDefinitionProvider({
      document,
      position,
      providerKind: ProviderKind.Definition,
    });
    return await provider.provideDefinitions();
  }
}
