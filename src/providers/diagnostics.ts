import {
  isIdentifier,
  isImportDeclaration,
  isStringLiteral,
} from "@babel/types";
import path = require("path");
import { closestMatch, distance } from "closest-match";
import {
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  languages,
  Location,
  Position,
  Range,
  TextDocument,
  Uri,
} from "vscode";
import { CssModuleExtensions, CSS_MODULE_EXTENSIONS } from "../constants";
import { Selector, parseCss } from "../parser/v2/css";
import Store from "../store/Store";
import { normalizePath } from "../path-utils";
import { Parser } from "../parser/Parser";
import { CSSDiagnosticsProvider } from "./css/CSSProvider";
import { ProviderKind } from "./types";

export type extended_Diagnostic = Diagnostic & {
  replace?: string;
  sourceAtRange: string;
};

export type DiagnosticsContext = {
  parser: Parser;
  baseDir?: string | undefined;
  activeFileDir: string | undefined;
  activeFileUri: Uri;
  document: TextDocument;
};

export enum DiagnosticCodeActions {
  RENAME_SELECTOR = "rename-selector",
  CREATE_SELECTOR = "add-selector",
}

export enum DiagnosticNonCodeActions {
  IGNORE_WARNING = "ignore-warning",
}

export class DiagnosticsProvider {
  protected selectorDiagnostics: SelectorRelatedDiagnostics;
  protected importDiagnostics: ImportsRelatedDiagnostics;
  protected cssDiagnostics: CSSDocumentDiagnostics;
  static diagnosticCollection =
    languages.createDiagnosticCollection("react-ts-css");
  activeFileUri: Uri;

  constructor(context: DiagnosticsContext) {
    this.selectorDiagnostics = new SelectorRelatedDiagnostics(context);
    this.importDiagnostics = new ImportsRelatedDiagnostics(context);
    this.cssDiagnostics = new CSSDocumentDiagnostics(context);
    this.activeFileUri = context.activeFileUri;
  }

  public async runDiagnostics() {}

  public async provideDiagnostics() {
    await this.selectorDiagnostics.runDiagnostics();
    this.importDiagnostics.runDiagnostics();
    await this.cssDiagnostics.runDiagnostics();
    DiagnosticsProvider.diagnosticCollection.set(this.activeFileUri, [
      ...this.importDiagnostics.diagnostics,
      ...this.selectorDiagnostics.diagnostics,
      ...this.cssDiagnostics.diagnostics,
    ]);
  }

  public getDiagnostics() {
    return [
      ...this.selectorDiagnostics.diagnostics,
      ...this.importDiagnostics.diagnostics,
      ...this.cssDiagnostics.diagnostics,
    ];
  }
}

class Diagnostics {
  public diagnostics: Array<extended_Diagnostic> = [];
  public ctx: DiagnosticsContext;
  constructor(context: DiagnosticsContext) {
    this.ctx = context;
  }
}

export class SelectorRelatedDiagnostics extends Diagnostics {
  static findClosestMatchingSelector(
    selector: string,
    allSelectors: Map<string, Selector>,
  ) {
    const match = closestMatch(selector, Array.from(allSelectors.keys()));
    if (typeof match === "string") {
      const dist = distance(selector, match);
      if (dist <= 2) {
        return match;
      }
    }
  }
  async runDiagnostics() {
    const {
      parser: { parsed_result },
    } = this.ctx;
    for (const accessor of parsed_result?.parsedResult.style_accessors ?? []) {
      const { property, object, isDynamic } = accessor;
      const style_reference = parsed_result?.style_references.get(object.name);
      if (style_reference) {
        const source_css_file = Store.cssModules.get(style_reference.uri);
        if (source_css_file) {
          const css_parser_result = await parseCss(source_css_file);
          const rangeAtEof = css_parser_result?.eofRange;
          const selectors = css_parser_result?.selectors;
          const selector = (() => {
            if (isStringLiteral(property)) {
              return property.value;
            }
            if (isIdentifier(property)) {
              return property.name;
            }
            return "";
          })();
          if (
            !isDynamic &&
            selector !== "" &&
            selectors &&
            !selectors.has(selector) &&
            !Store.ignoredDiagnostics.has(selector)
          ) {
            const closestMatchingSelector =
              SelectorRelatedDiagnostics.findClosestMatchingSelector(
                selector,
                selectors,
              );
            let additionalSelector = closestMatchingSelector
              ? `Did you mean '${closestMatchingSelector}'?`
              : "";
            const relativePath = path.relative(
              Store.workSpaceRoot ?? "",
              style_reference.uri,
            );
            this.diagnostics.push({
              message: `Selector '${selector}' does not exist in '${relativePath}'.${additionalSelector}`,
              source: "React TS CSS",
              sourceAtRange: selector,
              code: closestMatchingSelector
                ? DiagnosticCodeActions.RENAME_SELECTOR
                : DiagnosticCodeActions.CREATE_SELECTOR,
              replace: closestMatchingSelector
                ? closestMatchingSelector
                : selector,
              relatedInformation: [
                new DiagnosticRelatedInformation(
                  new Location(Uri.file(style_reference.uri), rangeAtEof!),
                  "Add this selector to " + relativePath,
                ),
              ],
              range: new Range(
                new Position(
                  property.loc?.start.line! - 1,
                  isStringLiteral(property)
                    ? property.loc?.start.column! + 1
                    : property.loc?.start.column!,
                ),
                new Position(
                  property.loc?.end.line! - 1,
                  isStringLiteral(property)
                    ? property.loc?.end.column! - 1
                    : property.loc?.end.column!,
                ),
              ),
              severity: DiagnosticSeverity.Warning,
            });
          }
        }
      }
    }
  }
}

export class ImportsRelatedDiagnostics extends Diagnostics {
  runDiagnostics() {
    const {
      parser: { parsed_result },
      baseDir,
      activeFileDir,
    } = this.ctx;
    for (const statement of parsed_result?.parsedResult?.import_statements ??
      []) {
      if (isImportDeclaration(statement)) {
        const module = statement.source.value;
        const ext = path.extname(module) as CssModuleExtensions;
        const isRelativeImport = module.startsWith(".");
        if (CSS_MODULE_EXTENSIONS.includes(ext) && module.includes(".module")) {
          const relativePath = normalizePath(
            !isRelativeImport
              ? path.resolve(Store.workSpaceRoot!, baseDir ?? "", module)
              : path.resolve(activeFileDir ?? "", module),
          );
          let doesModuleExists = Store.cssModules.has(relativePath);
          if (!doesModuleExists) {
            const resolvedModule = Store.resolveCssModuleAlias(module);
            if (resolvedModule) {
              doesModuleExists = Store.cssModules.has(resolvedModule);
            }
          }
          if (!doesModuleExists) {
            // check if its an alias
            this.diagnostics.push({
              message: `Module Not found '${module}'`,
              source: "React TS CSS",
              sourceAtRange: "",
              severity: DiagnosticSeverity.Error,
              range: new Range(
                new Position(
                  statement.loc!.start.line - 1,
                  statement.loc!.start.column,
                ),
                new Position(
                  statement.loc!.end.line - 1,
                  statement.loc!.end.column,
                ),
              ),
            });
          }
        }
      }
    }
  }
}

export class CSSDocumentDiagnostics extends Diagnostics {
  protected cssDiagnosticsProvider: CSSDiagnosticsProvider;
  constructor(options: DiagnosticsContext) {
    super(options);
    this.cssDiagnosticsProvider = new CSSDiagnosticsProvider({
      providerKind: ProviderKind.Diagnostic,
      position: new Position(0, 0),
      document: options.document,
    });
  }

  async runDiagnostics() {
    this.diagnostics = await this.cssDiagnosticsProvider.provideDiagnostics();
  }
}
