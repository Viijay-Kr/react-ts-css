import {
  CancellationToken,
  Color,
  ColorInformation,
  ColorPresentation,
  DocumentColorProvider as _DocumentColorProvider,
  Position,
  ProviderResult,
  Range,
  TextDocument,
} from "vscode";
import { ProviderKind } from "../types";
import { CSSProviderFactory } from "./CSSProviderFactory";

export class DocumentColorProvider implements _DocumentColorProvider {
  provideDocumentColors(
    document: TextDocument,
    token: CancellationToken
  ): ProviderResult<ColorInformation[]> {
    const provider = new CSSProviderFactory({
      providerKind: ProviderKind.Colors,
      document,
      position: new Position(0, 0), // providing a dummy position as it not needed for document
    });
    return provider.provideColorInformation();
  }
  provideColorPresentations(
    color: Color,
    context: { readonly document: TextDocument; readonly range: Range },
    token: CancellationToken
  ): ColorPresentation[] {
    const provider = new CSSProviderFactory({
      providerKind: ProviderKind.Colors,
      document: context.document,
      position: new Position(0, 0), // providing a dummy position as it not needed for document
    });
    return provider.getColorPresentation(color, context.range);
  }
}
