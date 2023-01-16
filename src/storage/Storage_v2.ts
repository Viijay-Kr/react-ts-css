import {
  Identifier,
  isIdentifier,
  isImportDeclaration,
  isImportDefaultSpecifier,
  isStringLiteral,
} from "@babel/types";
import path = require("path");
import {
  Diagnostic,
  DiagnosticSeverity,
  languages,
  TextDocument,
  TextEditor,
  Uri,
  window,
  Range,
  workspace,
  Position,
} from "vscode";
import { CSS_MODULE_EXTENSIONS, TS_MODULE_EXTENSIONS } from "../constants";
import {
  ParserResult,
  parseActiveFile,
  isCssModuleDeclaration,
} from "../parser/v2/tsx";
import * as fsg from "fast-glob";
import { parseCss, Selector } from "../parser/v2/css";
import { promises as fs_promises } from "node:fs";
import Settings from "../settings";
type FileName = string;
type StyleIdentifier = Identifier["name"];
type Selectors = {
  selectors: Map<
    StyleIdentifier,
    {
      uri: string;
      selectors: Map<string, Selector>;
    }
  >;
};

// Full file path of the active opened file
type SourceFiles = Map<string, boolean>;

type ParsedResult = Map<FileName, ParserResult & Selectors>;

export class experimental_Storage {
  public parsedResult: ParsedResult = new Map();
  protected _sourceFiles: SourceFiles = new Map();
  /** Root path of the workspace */
  protected _workSpaceRoot: string | undefined;
  static diagonisticCollection =
    languages.createDiagnosticCollection("react-ts-css");
  private tsConfig: any = {};

  public get activeTextEditor(): TextEditor {
    const editor = window.activeTextEditor;
    if (!editor) {
      throw new Error("No Text editor found");
    }
    return editor;
  }

  public get workSpaceRoot(): string | undefined {
    return this._workSpaceRoot;
  }

  public set workSpaceRoot(v: string | undefined) {
    this._workSpaceRoot = v;
  }

  /**
   * Map of all the css/scss files in the workspace
   */
  public get sourceFiles(): SourceFiles {
    return this._sourceFiles;
  }

  private async saveTsConfig() {
    try {
      if (Settings.tsconfig) {
        const contents = (
          await fs_promises.readFile(
            path.resolve(this.workSpaceRoot ?? "", Settings.tsconfig)
          )
        ).toString();
        const tsconfig = JSON.parse(contents);
        this.tsConfig = tsconfig;
      } else {
        throw new Error("Unable to resolve tsconfig.json");
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Adds one or more files to the map of source files
   * Called every time when a new file is created in the workspace
   * @param files readonly [Uri](#vscode.Uri)[]
   */
  public addSourceFiles(files: readonly Uri[]) {
    files.forEach((f) => {
      if (f.path.endsWith(".css") || f.path.endsWith(".scss")) {
        this._sourceFiles.set(f.path, true);
      }
    });
  }

  /**
   * Get the active opened text document
   * @returns [TextDocument](#vscode.TextDocument)
   */
  public getActiveTextDocument() {
    if (!this.activeTextEditor) {
      throw new Error("ActiveEditor not found inside storage");
    }
    return this.activeTextEditor.document;
  }

  public async bootStrap() {
    try {
      if (this.activeTextEditor.document.isDirty) {
        return;
      }
      if (!this.sourceFiles.size) {
        await this.setSourcefiles();
      }
      await this.saveTsConfig();
      const filePath = this.activeTextEditor.document.uri.path;
      const uri = this.activeTextEditor.document.uri;
      const workspaceRoot = workspace.getWorkspaceFolder(uri)?.uri.path;
      if (TS_MODULE_EXTENSIONS.includes(path.extname(filePath))) {
        const parsedResult = await parseActiveFile(
          this.activeTextEditor.document.getText()
        );
        if (parsedResult && workspaceRoot) {
          const selectors: Selectors["selectors"] = new Map();
          for (const statements of parsedResult.import_statements) {
            if (
              isImportDeclaration(statements) &&
              isCssModuleDeclaration(statements.source.value)
            ) {
              const sourceFiles = Array.from(this.sourceFiles.keys());
              const sourceCssFile = sourceFiles.find((f) =>
                f.includes(path.basename(statements.source.value))
              );
              if (sourceCssFile) {
                const _selectors = await this.buildSelectorsSet(sourceCssFile);
                let styleIdentifier = "";
                for (const specifier of statements.specifiers) {
                  if (isImportDefaultSpecifier(specifier)) {
                    if (isIdentifier(specifier.local)) {
                      styleIdentifier = specifier.local.name;
                    }
                  }
                }
                if (_selectors && styleIdentifier) {
                  selectors.set(styleIdentifier, {
                    selectors: _selectors,
                    uri: sourceCssFile,
                  });
                }
              }
            }
          }
          this.parsedResult.set(filePath, {
            ...parsedResult,
            selectors,
          });
          if (Settings.diagnostics) {
            return this.provideDiagnostics();
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Set the source css files on activation
   * TODO: store only modules
   */
  private async setSourcefiles() {
    const uri = window.activeTextEditor?.document?.uri;
    if (uri) {
      const workspaceRoot = workspace.getWorkspaceFolder(uri)?.uri.path;
      const files = await fsg("**/*.{scss,css}", {
        cwd: workspaceRoot,
        ignore: ["node_modules", "build", "dist"],
        absolute: true,
      });
      this.workSpaceRoot = workspaceRoot;
      files.forEach((v) => {
        this._sourceFiles.set(v, true);
      });
    }
  }

  private async buildSelectorsSet(cssModule: string) {
    return await parseCss(cssModule);
  }

  /**
   *
   * @param offset number
   * @returns ParserResult['unsafe_identifiers'] | undefined
   */
  public getAccessorAtOffset(document: TextDocument, offset: number) {
    const node = this.parsedResult.get(document.fileName);
    if (node) {
      return node.style_accessors?.find(
        ({ property: n, object: o }) =>
          (n?.start! <= offset && offset <= n?.end!) ||
          (o?.start! <= offset && offset <= o?.end!)
      );
    }
    return undefined;
  }

  /**
   * Get all selectors for a given Identifier
   * @param identfier Identifier['name']
   * @returns Map<string,Selector>
   */
  public getSelectorsByIdentifier(identfier: Identifier["name"]) {
    const filePath = this.activeTextEditor.document.uri.path;
    return this.parsedResult.get(filePath)?.selectors.get(identfier);
  }

  public getParsedResultByFilePath() {
    const filePath = this.activeTextEditor.document.uri.path;
    return this.parsedResult.get(filePath);
  }

  private flushStorage() {
    this.workSpaceRoot = undefined;
    this._sourceFiles = new Map();
    this.parsedResult = new Map();
  }

  /**
   * Flushes the entire storage on deactivation or opening a new workspace
   */
  public clear() {
    this.flushStorage();
  }

  private provideDiagnostics() {
    const parsedResult = this.getParsedResultByFilePath();
    const diagnostics: Diagnostic[] = [];
    const activeFileDir = path.parse(
      this.activeTextEditor.document.uri.path
    ).dir;
    const baseDir = this.tsConfig.compilerOptions.baseUrl || Settings.baseDir;
    for (const statement of parsedResult?.import_statements ?? []) {
      if (isImportDeclaration(statement)) {
        const module = statement.source.value;
        const ext = path.extname(module);
        const isRelative = module.startsWith(".");
        if (CSS_MODULE_EXTENSIONS.includes(ext) && module.includes(".module")) {
          const relativePath = !isRelative
            ? path.resolve(this.workSpaceRoot! + "/" + baseDir, module)
            : path.resolve(activeFileDir, module);
          if (!this.sourceFiles.has(relativePath)) {
            diagnostics.push({
              message: `Module Not found '${module}'`,
              source: "React TS CSS",
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
    for (const accessor of parsedResult?.style_accessors ?? []) {
      const { property, object } = accessor;
      const selectors = parsedResult?.selectors.get(object.name);
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
        if (!selectors.selectors.has(selector)) {
          const relativePath = path.relative(
            this.workSpaceRoot ?? "",
            selectors.uri
          );
          diagnostics.push({
            message: `Selector '${selector}' does not exist in '${relativePath}'`,
            source: "React TS CSS",
            range: new Range(
              new Position(
                object.loc?.start.line! - 1,
                object.loc?.start.column!
              ),
              new Position(
                property.loc?.end.line! - 1,
                property.loc?.end.column!
              )
            ),
            severity: DiagnosticSeverity.Warning,
          });
        }
      }
    }
    experimental_Storage.diagonisticCollection.set(
      this.activeTextEditor.document.uri,
      diagnostics
    );
    return diagnostics;
  }
}
export default new experimental_Storage();
