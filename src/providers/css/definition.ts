import {
  CancellationToken,
  Definition,
  DefinitionProvider as _DefinitionProvider,
  LocationLink,
  Position,
  ProviderResult,
  TextDocument,
} from "vscode";
import Settings from "../../settings";
import { ProviderKind } from "../types";
import { CSSProvider } from "./CSSProvider";

export class CssDefinitionProvider implements _DefinitionProvider {
  provideDefinition(
    document: TextDocument,
    position: Position
  ): LocationLink[] {
    if (!Settings.cssDefinitions) {
      return [];
    }
    const provider = new CSSProvider({
      document,
      position,
      providerKind: ProviderKind.Definition,
    });
    return provider.provideDefinitions();
  }
}
