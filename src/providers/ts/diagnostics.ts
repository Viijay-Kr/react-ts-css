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
import { CssModuleExtensions, CSS_MODULE_EXTENSIONS } from "../../constants";
import { Selector } from "../../parser/v2/css";
import Store from "../../store/Store";
import { normalizePath } from "../../path-utils";
import Settings from '../../settings';

export type extended_Diagnostic = Diagnostic & {
  replace?: string;
  sourceAtRange: string;
};

export type DiagnosticsContext = {
  parsedResult: ReturnType<typeof Store.getActiveTsModule>;
  baseDir?: string | undefined;
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
  protected readonly parsedResult: ReturnType<typeof Store.getActiveTsModule>;
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
  renameSelector() { }
  runDiagnostics() {
    for (const accessor of this.parsedResult?.style_accessors ?? []) {
      const { property, object, isDynamic } = accessor;
      const style_reference = this.parsedResult?.style_references.get(
        object.name
      );
      if (style_reference) {
        const selectors = Store.cssModules.get(style_reference.uri)?.selectors;
        const rangeAtEof = Store.cssModules.get(style_reference.uri)?.eofRange;
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
              selectors
            );
          let additionalSelector = closestMatchingSelector
            ? `Did you mean '${closestMatchingSelector}'?`
            : "";
          const relativePath = path.relative(
            Store.workSpaceRoot ?? "",
            style_reference.uri
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
        const isRelativeImport = module.startsWith(".");
        if (CSS_MODULE_EXTENSIONS.includes(ext) && module.includes(".module")) {
          const relativePath = normalizePath(
            !isRelativeImport
              ? path.resolve(Store.workSpaceRoot!, this.baseDir ?? "", module)
              : path.resolve(this.activeFileDir, module)
          );
          let doesModuleExists = Store.cssModules.has(relativePath);
          const isAliasImport = module.startsWith(Settings.tsconfigPathPrefix ?? "");
          if (isAliasImport) {
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
