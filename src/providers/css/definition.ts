import {
  CancellationToken,
  Definition,
  DefinitionProvider as _DefinitionProvider,
  LocationLink,
  Position,
  ProviderResult,
  TextDocument,
} from "vscode";
import { ProviderKind } from "../types";
import { CSSProviderFactory } from "./CSSProviderFactory";

export class CssDefinitionProvider implements _DefinitionProvider {
  provideDefinition(
    document: TextDocument,
    position: Position
  ): LocationLink[] {
    const provider = new CSSProviderFactory({
      document,
      position,
      providerKind: ProviderKind.Definition,
    });
    return provider.provideDefinitions();
  }
}
