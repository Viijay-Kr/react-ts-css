import {
  Color,
  ColorInformation,
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  Position,
  Range,
  ColorPresentation,
  TextDocument,
  LocationLink,
  DefinitionLink,
} from "vscode";
import {
  createStyleSheet,
  CssParserResult,
  getLanguageId,
  getLanguageService,
  Variable,
} from "../../parser/v2/css";
import { normalizePath } from "../../path-utils";
import Store from "../../store/Store";
import { Function, Node, NodeType, Stylesheet } from "../../css-node.types";
import {
  isColorString,
  rangeStrictEqual,
  toColorCode,
} from "../../parser/utils";
import {
  TextDocument as css_TextDocument,
  Range as css_Range,
} from "vscode-css-languageservice";
import { ProviderKind } from "../types";

export class CSSProviderFactory {
  public providerKind: ProviderKind = ProviderKind.Invalid;
  /** Current Active Position in the Document */
  public position: Position;
  /** Current Active Text Document in focus */
  public document: TextDocument;

  public constructor(options: {
    providerKind: ProviderKind;
    position: Position;
    document?: TextDocument;
  }) {
    this.providerKind = options.providerKind;
    this.position = options.position;
    if (options.document) {
      this.document = options.document;
    } else {
      this.document = Store.getActiveTextDocument();
    }
  }

  public getCssVariablesForCompletion() {
    const module = normalizePath(this.document.uri.fsPath);
    const variables: CssParserResult["variables"] = [];
    const thisDocPath = this.document.uri.fsPath;
    if (module.endsWith(".css")) {
      const cssModules = Array.from(Store.sourceFiles.keys()).filter((c) =>
        c.endsWith(".css")
      );
      for (const m of cssModules) {
        const node = Store.sourceFiles.get(m);
        if (node) {
          variables.push(...node.variables);
        }
      }
    }
    const completionList = new CompletionList();
    for (const {
      name,
      value,
      location: { uri },
    } of variables) {
      if (name && value) {
        if (uri.fsPath === thisDocPath) {
          continue;
        }
        const item = new CompletionItem(name, CompletionItemKind.Variable);
        const candidate = this.getNodeAtOffset();
        item.detail = value;
        item.insertText = candidate?.getText().includes("var")
          ? `${name}`
          : `var(${name})`;
        if (isColorString(value)) {
          item.kind = CompletionItemKind.Color;
          item.detail = toColorCode(value);
        }
        completionList.items.push(item);
      }
    }
    return completionList;
  }

  public getNodeAtOffset(): Node | undefined {
    const styleSheet = createStyleSheet(this.document);
    const offset = this.document.offsetAt(this.position);
    const cssmodule = Store.sourceFiles.get(
      normalizePath(this.document.uri.path)
    );
    if (cssmodule) {
      const node = styleSheet;
      let candidate: Node | undefined = undefined;

      // Find the shortest node at the position
      node.accept((node) => {
        if (node.offset === -1 && node.length === -1) {
          return true;
        }
        if (node.offset <= offset && node.end >= offset) {
          if (!candidate) {
            candidate = node;
          } else if (node.length <= candidate.length) {
            candidate = node;
          }
          return true;
        }
        return false;
      });
      return candidate;
    }
    return;
  }

  public provideColorInformation(): ColorInformation[] {
    const colorInformation: ColorInformation[] = [];
    const colorVariables: Set<Variable> = new Set();
    for (const [, value] of Store.sourceFiles.entries()) {
      value.variables.forEach((v) => {
        if (v.kind === "color") {
          colorVariables.add(v);
        }
      });
    }
    const stylesheet = createStyleSheet(this.document);

    stylesheet.accept((node) => {
      if (node.type === NodeType.Function) {
        const identifier = (node as Function).getIdentifier();
        if (identifier?.matches("var")) {
          const args = (node as Function).getArguments();
          for (const [v] of colorVariables.entries()) {
            if (v.name === args.getText()) {
              const source = Store.sourceFiles.get(v.location.uri.path);
              if (source) {
                const match = source.colors.find((c) =>
                  rangeStrictEqual(c.range, v.location.value_range)
                );
                if (match) {
                  colorInformation.push({
                    color: match.color,
                    range: new Range(
                      this.document.positionAt(node.offset),
                      this.document.positionAt(node.end)
                    ),
                  });
                }
              }
            }
          }
        }
      }
      return true;
    });
    return colorInformation;
  }

  public getColorPresentation(color: Color, range: Range): ColorPresentation[] {
    const stylesheet = createStyleSheet(this.document);
    const _document = css_TextDocument.create(
      this.document.uri.path,
      getLanguageId(this.document.uri.path),
      1,
      this.document.getText()
    );
    const ls = getLanguageService(this.document.uri.path);
    // @ts-ignore
    return ls.getColorPresentations(_document, stylesheet, color, range);
  }

  public provideDefinitions(): LocationLink[] {
    const nodeAtOffset = this.getNodeAtOffset();
    const candidates: LocationLink[] = [];
    const variables = Array.from(Store.sourceFiles.entries())
      .map(([, value]) => value.variables)
      .flat();
    for (const v of variables) {
      if (
        v.name === nodeAtOffset?.getText() &&
        v.location.uri.path !== this.document.uri.path // Let VS code take care of resolving variables from the active module
      ) {
        candidates.push({
          originSelectionRange: new Range(
            this.document.positionAt(nodeAtOffset!.offset),
            this.document.positionAt(nodeAtOffset!.end)
          ),
          targetUri: v.location.uri,
          targetRange: new Range(
            new Position(
              v.location.full_range.start.line,
              v.location.full_range.start.character
            ),
            new Position(
              v.location.full_range.end.line,
              v.location.full_range.end.character
            )
          ),
        });
      }
    }
    return candidates;
  }
}
