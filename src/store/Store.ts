import { Identifier } from "@babel/types";
import path = require("path");
import {
  languages,
  TextEditor,
  Uri,
  window,
  TextDocument,
  Range,
  workspace,
} from "vscode";
import {
  CssModuleExtensions,
  CSS_MODULE_EXTENSIONS,
  MODULE_EXTENSIONS,
} from "../constants";
import { ParserResult } from "../parser/v2/ts";
import * as fsg from "fast-glob";
import { CssParserResult, parseCss, Selector } from "../parser/v2/css";
import { promises as fs_promises } from "node:fs";
import Settings from "../settings";
import { Parser } from "../parser/Parser";
import { DiagnosticsProvider } from "../providers/ts/diagnostics";
import { normalizePath } from "../path-utils";

type FileName = string;
type StyleIdentifier = Identifier["name"];

export type StyleReferences = {
  style_references: Map<
    StyleIdentifier,
    {
      uri: string;
    }
  >;
};

interface CSSReferences {
  references: Set<FileName>;
}
// Full file path of the active opened file
type CssModules = Map<string, CssParserResult & CSSReferences>;
export type ParsedResult = Map<FileName, ParserResult & StyleReferences>;
export type TsModules = ParsedResult;

export type TsConfig = {
  compilerOptions: {
    baseUrl: string;
  };
};

export type IgnoreDiagnostis = Map<
  string, // Selector
  Range // Range of the Selector
>;
export class Store {
  protected _cssModules: CssModules = new Map();
  protected _tsModules: TsModules = new Map();
  /** Root path of the workspace */
  protected _workSpaceRoot: string | undefined;
  static diagonisticCollection =
    languages.createDiagnosticCollection("react-ts-css");
  protected diagnosticsProvider: DiagnosticsProvider | undefined;
  public ignoredDiagnostics: IgnoreDiagnostis = new Map();
  private tsConfig: TsConfig = {
    compilerOptions: {
      baseUrl: "",
    },
  };

  constructor() {
    const uri = window.activeTextEditor?.document?.uri;
    if (uri) {
      const _uri = workspace.getWorkspaceFolder(uri)?.uri;
      const workspaceRoot = _uri?.fsPath;
      this.workSpaceRoot = workspaceRoot;
    }
  }

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
  public get cssModules(): CssModules {
    return this._cssModules;
  }

  /**
   * Set the source css files on activation
   * TODO: store only modules
   */
  private async setCssModules() {
    const uri = window.activeTextEditor?.document?.uri;
    if (uri) {
      const _uri = workspace.getWorkspaceFolder(uri)?.uri;
      const workspaceRoot = _uri?.fsPath;
      const glob = `**/*.{${CSS_MODULE_EXTENSIONS.map((e) =>
        e.replace(".", "")
      ).join(",")}}`;
      this.workSpaceRoot = workspaceRoot;
      const files = await fsg(glob, {
        cwd: workspaceRoot,
        ignore: ["node_modules", "build", "dist", "coverage"],
        absolute: true,
      });
      await Promise.all(
        files.map(async (v) => {
          await this.storeCssParserResult(v);
        })
      );
    }
  }

  /**
   * Map of all the ts/tsx files in the workspace
   */
  public get tsModules(): TsModules {
    return this._tsModules;
  }

  public async setTsModules() {
    const glob = `**/*.{${MODULE_EXTENSIONS.map((e) => e.replace(".", "")).join(
      ","
    )}}`;
    const files = await fsg(glob, {
      cwd: this.workSpaceRoot || __dirname,
      ignore: [
        "node_modules",
        "build",
        "dist",
        "coverage",
        "**/*.stories.tsx",
        "**/*.stories.ts",
        "**/*.test.ts",
        "**/*.test.tsx",
      ],
      absolute: true,
    });
    const parserFactory = new Parser({
      workspaceRoot: this.workSpaceRoot,
      tsConfig: this.tsConfig,
      baseDir: Settings.baseDir,
      cssModules: this.cssModules,
    });
    return Promise.all(
      files.map(async (file) => {
        const content = (await fs_promises.readFile(file)).toString();
        return await this.storeTsParserResult({
          filePath: file,
          content,
          parserFactory,
        });
      })
    );
  }

  private async storeTsParserResult({
    filePath: file,
    content,
    parserFactory,
  }: {
    filePath: string;
    parserFactory: Parser;
    content: string;
  }) {
    const result = await parserFactory.parse({
      filePath: normalizePath(file),
      content,
    });
    if (result) {
      this.tsModules.set(file, {
        ...result.parsedResult,
        style_references: result.style_references,
      });
      for (const [, value] of result.style_references) {
        if (this.cssModules.has(value.uri)) {
          const module = this.cssModules.get(value.uri);
          if (module) {
            module.references.add(file);
            this.cssModules.set(value.uri, module);
          }
        }
      }
    }
    return result;
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
  public async addSourceFiles(files: readonly Uri[]) {
    files.forEach(async (f) => {
      if (
        CSS_MODULE_EXTENSIONS.includes(
          path.extname(f.fsPath) as CssModuleExtensions
        )
      ) {
        await this.storeCssParserResult(f.path);
      }
    });
  }

  public async storeCssParserResult(module: string) {
    try {
      const result = await parseCss(module);
      const cached = this._cssModules.get(module);
      if (result) {
        this._cssModules.set(module, { ...result, references: cached?.references ?? new Set() });
      }
    } catch (e) { }
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
      if (!this.tsConfig) {
        await this.saveTsConfig();
      }
      if (!this.cssModules.size) {
        await this.setCssModules();
      }
      if (!this.tsModules.size) {
        await this.setTsModules();
      }
      const document = this.activeTextEditor.document;
      const filePath = document.uri.fsPath;
      const uri = document.uri;

      if (
        CSS_MODULE_EXTENSIONS.includes(
          path.extname(filePath) as CssModuleExtensions
        )
      ) {
        this.storeCssParserResult(filePath);
      } else {
        const content = document.getText();
        const workspaceRoot = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
        const parserFactory = new Parser({
          workspaceRoot,
          tsConfig: this.tsConfig,
          baseDir: Settings.baseDir,
          cssModules: this.cssModules,
        });
        await this.storeTsParserResult({
          filePath,
          content,
          parserFactory,
        });
        if (Settings.diagnostics) {
          return this.provideDiagnostics();
        }
      }
    } catch (e) { }
  }

  /**
   *
   * @param offset number
   * @returns ParserResult['unsafe_identifiers'] | undefined
   */
  public getAccessorAtOffset(document: TextDocument, offset: number) {
    const node = this.tsModules.get(document.fileName);
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
  public getStyleReferenceByIdentifier(identfier: Identifier["name"]) {
    return this.getActiveTsModule()?.style_references.get(identfier);
  }

  public getActiveTsModule() {
    const filePath = this.activeTextEditor.document.uri.fsPath;
    return this.tsModules.get(filePath);
  }

  public getTsModuleByPath(file: string) {
    return this.tsModules.get(file);
  }

  /**
   * Flushes the entire storage on deactivation or opening a new workspace
   */
  public flushStorage() {
    this.workSpaceRoot = undefined;
    this._cssModules = new Map();
    this._tsModules = new Map();
  }

  private provideDiagnostics() {
    const parsedResult = this.getActiveTsModule();
    const activeFileDir = path.parse(
      this.activeTextEditor.document.uri.fsPath
    ).dir;
    const baseDir = this.tsConfig.compilerOptions.baseUrl || Settings.baseDir;
    const activeFileUri = this.activeTextEditor.document.uri;
    if (Settings.diagnostics) {
      this.diagnosticsProvider = new DiagnosticsProvider({
        parsedResult,
        activeFileDir,
        baseDir,
        activeFileUri,
      });
      this.diagnosticsProvider.runDiagnostics();
      this.diagnosticsProvider.provideDiagnostics();
      return this.diagnosticsProvider.getDiagnostics();
    }
  }

  /**
   *
   * @param args [Range, string] Range is range of source, second argument is the selector which should be ignored from diagnostic
   */
  public collectIgnoredDiagnostics([range, source]: [Range, string]) {
    this.ignoredDiagnostics.set(source, range);
    this.provideDiagnostics();
  }
}
export default new Store();
