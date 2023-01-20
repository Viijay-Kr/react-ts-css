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
  Uri,
} from "vscode";
import { CssModuleExtensions, CSS_MODULE_EXTENSIONS } from "../constants";
import { Selector } from "../parser/v2/css";
import Storage_v2 from "../storage/Storage_v2";
import { normalizePath } from "../path-utils";

export type extended_Diagnostic = Diagnostic & {
  replace?: string;
  sourceAtRange: string;
};

export type DiagnosticsContext = {
  parsedResult: ReturnType<typeof Storage_v2.getParsedResultByFilePath>;
  baseDir: string | undefined;
  activeFileDir: string | undefined;
  activeFileUri: Uri;
};

export enum DiagnosticCodeActions {
  RENAME_SELECTOR = "rename-selector",
  CREATE_SELECTOR = "add-selector",
}

export enum DiagnosticNonCodeActions {
  IGNORE_WARNING = "ignore-warning",
}

export class DiagnosticsProvider {
  selectorDiagnostics: SelectorRelatedDiagnostics;
  importDiagnostics: ImportsRelatedDiagnostics;
  static diagnosticCollection =
    languages.createDiagnosticCollection("react-ts-css");
  activeFileUri: Uri;

  constructor(context: DiagnosticsContext) {
    this.selectorDiagnostics = new SelectorRelatedDiagnostics(context);
    this.importDiagnostics = new ImportsRelatedDiagnostics(context);
    this.activeFileUri = context.activeFileUri;
  }

  public runDiagnostics() {
    this.selectorDiagnostics.runDiagnostics();
    this.importDiagnostics.runDiagnostics();
  }

  public provideDiagnostics() {
    DiagnosticsProvider.diagnosticCollection.set(this.activeFileUri, [
      ...this.importDiagnostics.diagnostics,
      ...this.selectorDiagnostics.diagnostics,
    ]);
  }

  public getDiagnostics() {
    return [
      ...this.selectorDiagnostics.diagnostics,
      ...this.importDiagnostics.diagnostics,
    ];
  }
}

class Diagnostics {
  public diagnostics: Array<extended_Diagnostic> = [];
  protected readonly parsedResult: ReturnType<
    typeof Storage_v2.getParsedResultByFilePath
  >;
  protected readonly baseDir: string | undefined;
  public readonly activeFileDir: string;
  constructor(context: DiagnosticsContext) {
    this.parsedResult = context.parsedResult;
    this.activeFileDir = context.activeFileDir || "";
    this.baseDir = context.baseDir;
  }
}

export class SelectorRelatedDiagnostics extends Diagnostics {
  static findClosestMatchingSelector(
    selector: string,
    allSelectors: Map<string, Selector>
  ) {
    const match = closestMatch(selector, Array.from(allSelectors.keys()));
    if (typeof match === "string") {
      const dist = distance(selector, match);
      if (dist <= 2) {
        return match;
      }
    }
  }
  renameSelector() {}
  runDiagnostics() {
    for (const accessor of this.parsedResult?.style_accessors ?? []) {
      const { property, object } = accessor;
      const selectors = this.parsedResult?.selectors.get(object.name);
      if (selectors) {
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
          selector !== "" &&
          !selectors.selectors.has(selector) &&
          !Storage_v2.ignoredDiagnostics.has(selector)
        ) {
          const closestMatchingSelector =
            SelectorRelatedDiagnostics.findClosestMatchingSelector(
              selector,
              selectors.selectors
            );
          let additionalSelector = closestMatchingSelector
            ? `Did you mean '${closestMatchingSelector}'?`
            : "";
          const relativePath = path.relative(
            Storage_v2.workSpaceRoot ?? "",
            selectors.uri
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
                new Location(Uri.file(selectors.uri), selectors.rangeAtEof),
                "Add this selector to " + relativePath
              ),
            ],
            range: new Range(
              new Position(
                property.loc?.start.line! - 1,
                isStringLiteral(property)
                  ? property.loc?.start.column! + 1
                  : property.loc?.start.column!
              ),
              new Position(
                property.loc?.end.line! - 1,
                isStringLiteral(property)
                  ? property.loc?.end.column! - 1
                  : property.loc?.end.column!
              )
            ),
            severity: DiagnosticSeverity.Warning,
          });
        }
      }
    }
  }
}

export class ImportsRelatedDiagnostics extends Diagnostics {
  runDiagnostics() {
    for (const statement of this.parsedResult?.import_statements ?? []) {
      if (isImportDeclaration(statement)) {
        const module = statement.source.value;
        const ext = path.extname(module) as CssModuleExtensions;
        const isRelative = module.startsWith(".");
        if (CSS_MODULE_EXTENSIONS.includes(ext) && module.includes(".module")) {
          const relativePath = normalizePath(
            !isRelative
              ? path.resolve(
                  Storage_v2.workSpaceRoot!,
                  this.baseDir ?? "",
                  module
                )
              : path.resolve(this.activeFileDir, module)
          );
          if (!Storage_v2.sourceFiles.has(relativePath)) {
            this.diagnostics.push({
              message: `Module Not found '${module}'`,
              source: "React TS CSS",
              sourceAtRange: "",
              severity: DiagnosticSeverity.Error,
              range: new Range(
                new Position(
                  statement.loc!.start.line - 1,
                  statement.loc!.start.column
                ),
                new Position(
                  statement.loc!.end.line - 1,
                  statement.loc!.end.column
                )
              ),
            });
          }
        }
      }
    }
  }
}
