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
  Location,
  Uri,
} from "vscode";
import {
  createStyleSheet,
  CssParserResult,
  getLanguageId,
  getLanguageService,
  parseCss,
  Selector,
  Variable,
} from "../../parser/v2/css";
import { normalizePath } from "../../path-utils";
import Store from "../../store/Store";
import { Function, Node, NodeType } from "../../css-node.types";
import {
  isColorString,
  rangeLooseEqual,
  rangeStrictEqual,
  toColorCode,
  toVsCodePosition,
  toVsCodeRange,
} from "../../parser/utils";
import { TextDocument as css_TextDocument } from "vscode-css-languageservice";
import { ProviderKind } from "../types";
import {
  isIdentifier,
  isImportDeclaration,
  isImportDefaultSpecifier,
  isStringLiteral,
} from "@babel/types";
import path = require("path");
import { ReferenceCodeLens } from "./codelens";
import { readFile } from "fs/promises";

export class CSSProvider {
  public providerKind: ProviderKind = ProviderKind.Invalid;
  /** Current Active Position in the Document */
  public position: Position;
  /** Current Active Text Document in focus */
  public document: TextDocument;
  public static PEEK_REFERENCES_COMMAND = "peek_lens_references";

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

  public async getCssVariablesForCompletion() {
    const module = normalizePath(this.document.uri.fsPath);
    const variables: CssParserResult["variables"] = [];
    const thisDocPath = this.document.uri.fsPath;
    if (module.endsWith(".css")) {
      const cssModules = Array.from(Store.cssModules.keys()).filter((c) =>
        c.endsWith(".css")
      );
      await Promise.allSettled(
        cssModules.map(async (m) => {
          const css_parser_result = await parseCss(m);
          if (css_parser_result) {
            variables.push(...css_parser_result.variables);
          }
        })
      );
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
    const cssmodule = Store.cssModules.get(
      normalizePath(this.document.uri.fsPath)
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

  public async provideColorInformation(): Promise<ColorInformation[]> {
    const colorInformation: ColorInformation[] = [];
    const colorVariables: Set<Variable> = new Set();
    const parser_result: Map<
      string,
      Awaited<ReturnType<typeof parseCss>>
    > = new Map();
    await Promise.all(
      Array.from(Store.cssModules.entries()).map(async ([m]) => {
        const value = await parseCss(m);
        parser_result.set(m, value);
        value?.variables.forEach((v) => {
          if (v.kind === "color") {
            colorVariables.add(v);
          }
        });
      })
    );

    const stylesheet = createStyleSheet(this.document);

    stylesheet.accept((node) => {
      if (node.type === NodeType.Function) {
        const identifier = (node as Function).getIdentifier();
        if (identifier?.matches("var")) {
          const args = (node as Function).getArguments();
          for (const [v] of colorVariables.entries()) {
            if (v.name === args.getText()) {
              const source = parser_result.get(
                normalizePath(v.location.uri.fsPath)
              );
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

  public async provideDefinitions(): Promise<LocationLink[]> {
    const nodeAtOffset = this.getNodeAtOffset();
    const candidates: LocationLink[] = [];
    const variables = await Promise.all(
      Array.from(Store.cssModules.entries()).map(
        async ([, value]) => (await parseCss(value))?.variables
      )
    );
    for (const v of variables.flat()) {
      if (
        v &&
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

  public async provideReferences(): Promise<Location[]> {
    const range = this.document.getWordRangeAtPosition(this.position);
    const referenceCandidates = await this.getReferenceCandidates();
    const candidates: Location[] = [];
    const filePath = normalizePath(this.document.uri.fsPath);
    const css_parser_result = await parseCss(filePath);
    const selectors = css_parser_result?.selectors;
    let selectorAtRange: Selector | undefined;

    if (selectors) {
      for (const [, value] of selectors.entries()) {
        if (range && value.range) {
          if (rangeLooseEqual(range, value.range)) {
            selectorAtRange = value;
          }
        }
      }
    }
    if (!selectorAtRange) {
      return [];
    }
    const references = await Promise.allSettled(
      referenceCandidates.map(async (c) => ({
        uri: c,
        parsed_result: await Store.parser?.getParsedResultByFile(c),
      }))
    );

    for (const ref of references) {
      if (ref.status === "fulfilled") {
        const parsedResult = ref.value.parsed_result?.parsedResult;
        if (parsedResult) {
          for (const accessor of parsedResult.style_accessors) {
            let _selector;
            if (isStringLiteral(accessor.property)) {
              _selector = accessor.property.value;
            } else if (isIdentifier(accessor.property)) {
              _selector = accessor.property.name;
            }
            if (selectorAtRange.selector === _selector) {
              const preferedRange = (() => {
                return new Range(
                  new Position(
                    accessor.object.loc!.start.line - 1,
                    accessor.object.loc!.start.column
                  ),
                  new Position(
                    accessor.property.loc!.end.line - 1,
                    accessor.property.loc!.end.column
                  )
                );
              })();
              candidates.push(
                new Location(Uri.file(ref.value.uri), preferedRange)
              );
            }
          }
        }
      }
    }

    return candidates;
  }

  public async resolveCodeLens(range: Range): Promise<Location[]> {
    let candidates: Location[] = [];
    const filePath = normalizePath(this.document.uri.fsPath);
    const css_parser_result = await parseCss(filePath);
    const selectors = css_parser_result?.selectors;
    const referenceCandidates = await this.getReferenceCandidates();
    let selectorAtRange: Selector | undefined;
    console.log(range, this.document.getText(range));
    if (selectors) {
      for (const [, value] of selectors.entries()) {
        if (range && value.range) {
          if (rangeLooseEqual(range, value.range)) {
            selectorAtRange = value;
          }
        }
      }
    }

    const references = await Promise.allSettled(
      referenceCandidates.map(async (c) => ({
        uri: c,
        parsed_result: await Store.parser?.getParsedResultByFile(c),
      }))
    );
    for (const ref of references) {
      if (ref.status === "fulfilled") {
        const parsedResult = ref.value.parsed_result?.parsedResult;
        if (parsedResult) {
          for (const accessor of parsedResult.style_accessors) {
            let _selector;
            if (isStringLiteral(accessor.property)) {
              _selector = accessor.property.value;
            } else if (isIdentifier(accessor.property)) {
              _selector = accessor.property.name;
            }
            if (selectorAtRange?.selector === _selector) {
              const preferedRange = (() => {
                return new Range(
                  new Position(
                    accessor.property.loc!.start.line - 1,
                    accessor.property.loc!.start.column
                  ),
                  new Position(
                    accessor.property.loc!.end.line - 1,
                    accessor.property.loc!.end.column
                  )
                );
              })();
              candidates.push(
                new Location(Uri.file(ref.value.uri), preferedRange)
              );
            }
          }
        }
      }
    }
    return candidates;
  }

  public async getReferenceCandidates() {
    const candidates: string[] = [];
    const filePath = normalizePath(this.document.uri.fsPath);
    try {
      await Promise.allSettled(
        Array.from(Store.tsModules.entries()).map(async ([k, v]) => {
          if ([".tsx", ".jsx"].includes(path.extname(v))) {
            const document = await readFile(v);
            if (document) {
              const text = document.toString();
              const fileImportPattern = new RegExp(path.basename(filePath));
              const fileImportMatches = text.match(fileImportPattern);
              if (fileImportMatches) {
                candidates.push(v);
              }
            }
          }
        })
      );
    } catch (e) {
      console.error(e);
    }

    return candidates;
  }
  public async provideCodeLenses(): Promise<ReferenceCodeLens[]> {
    const filePath = normalizePath(this.document.uri.fsPath);
    const source_css_file = Store.cssModules.get(filePath);
    const selectors = (await parseCss(source_css_file ?? ""))?.selectors;
    const codeLens: ReferenceCodeLens[] = [];
    if (selectors) {
      for (const [, _selector] of selectors?.entries()) {
        const range = toVsCodeRange(_selector.range);
        codeLens.push(
          new ReferenceCodeLens(this.document, this.document.fileName, range)
        );
      }
    }
    return codeLens;
  }
}
