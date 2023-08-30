import path = require("path");
import { languages, TextEditor, Uri, window, Range, workspace } from "vscode";
import { CssModuleExtensions, CSS_MODULE_EXTENSIONS } from "../constants";
import * as fsg from "fast-glob";
import { promises as fs_promises } from "node:fs";
import Settings from "../settings";
import { Parser } from "../parser/Parser";
import { DiagnosticsProvider } from "../providers/ts/diagnostics";
import { normalizePath } from "../path-utils";

// Full file path of the active opened file
type CssModules = Map<string, string>;

export type TsConfig = {
  compilerOptions: {
    baseUrl?: string;
    paths?: {
      [key: string]: Array<string>;
    };
  };
  baseDir: string;
};

export type TsConfigMap = Map<string, TsConfig>;

export type IgnoreDiagnostis = Map<
  string, // Selector
  Range // Range of the Selector
>;

export class Store {
  public cssModules: CssModules = new Map();
  /** Root path of the workspace */
  protected _workSpaceRoot: string | undefined;
  static diagonisticCollection =
    languages.createDiagnosticCollection("react-ts-css");
  protected diagnosticsProvider: DiagnosticsProvider | undefined;
  public ignoredDiagnostics: IgnoreDiagnostis = new Map();
  public tsConfig: TsConfigMap = new Map();
  public parser: Parser | undefined;

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

  private async experimental_setCssModules() {
    const uri = window.activeTextEditor?.document?.uri;
    if (uri) {
      if (!this.workSpaceRoot) {
        const _uri = workspace.getWorkspaceFolder(uri)?.uri;
        const workspaceRoot = _uri?.fsPath;
        this.workSpaceRoot = workspaceRoot;
      }
      const glob = `**/*.{${CSS_MODULE_EXTENSIONS.map((e) =>
        e.replace(".", "")
      ).join(",")}}`;
      const files = await fsg(glob, {
        cwd: this.workSpaceRoot,
        ignore: ["node_modules", "build", "dist", "coverage"],
        absolute: true,
      });
      files.forEach((file) => this.cssModules.set(file, file));
    }
  }

  private async saveTsConfigAutomatically() {
    try {
      const configs = await fsg(["**/*/tsconfig.json", "tsconfig.json"], {
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
        cwd: this.workSpaceRoot,
      });
      await Promise.allSettled(
        configs.map(async (config) => {
          const contents = (
            await fs_promises.readFile(
              path.resolve(this.workSpaceRoot ?? "", config)
            )
          ).toString();
          try {
            this.tsConfig.set(config, {
              ...JSON.parse(contents),
              baseDir: normalizePath(
                path.join(this.workSpaceRoot ?? "", path.dirname(config))
              ),
            } as TsConfig);
          } catch (e) {
            console.error(e);
          }
        })
      );
    } catch (e) {
      // Catch errors here
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
        this.cssModules.set(f.path, f.path);
      }
    });
  }

  resolveCssModuleAlias(source: string): string | undefined {
    const activeFileDir = normalizePath(
      path.dirname(this.getActiveTextDocument().fileName)
    );
    for (const [, config] of this.tsConfig) {
      if (activeFileDir.includes(config.baseDir)) {
        const alias = normalizePath(path.dirname(source));
        const module_name = path.basename(source);
        const paths = config.compilerOptions.paths;
        const baseUrl = config.compilerOptions.baseUrl;
        if (!paths) {
          // assuming baseUrl should be present if no paths are defined
          if (baseUrl) {
            const final_path = normalizePath(
              path.join(
                config.baseDir,
                config.compilerOptions.baseUrl ?? "",
                source
              )
            );
            if (this.cssModules.has(final_path)) {
              return final_path;
            }
          }
        } else {
          for (const [_path, values] of Object.entries(paths ?? {})) {
            const tsconfig_alias_path_dir = normalizePath(path.dirname(_path));
            let final_path = "";
            if (alias === tsconfig_alias_path_dir) {
              const alias_value = values[0].replace("*", "");
              final_path = normalizePath(
                path.join(
                  config.baseDir,
                  config.compilerOptions.baseUrl ?? "",
                  alias_value,
                  module_name
                )
              );
            } else if (alias.indexOf(tsconfig_alias_path_dir) === 0) {
              const alias_value = values[0].replace("*", "");
              final_path = normalizePath(
                path.join(
                  config.baseDir,
                  alias_value,
                  alias.replace(tsconfig_alias_path_dir, ""),
                  module_name
                )
              );
            }
            if (this.cssModules.has(final_path)) {
              return final_path;
            }
          }
        }
      }
    }
    return;
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

  public async experimental_BootStrap() {
    try {
      if (this.activeTextEditor.document.isDirty) {
        return;
      }
      if (!this.cssModules.size) {
        await this.experimental_setCssModules();
      }
      await this.saveTsConfigAutomatically();
      this.parser = new Parser({
        workspaceRoot: this.workSpaceRoot,
        tsConfig: this.tsConfig,
        baseDir: Settings.baseDir,
      });
      const document = this.activeTextEditor.document;
      const filePath = document.uri.path;
      await this.parser.parse({ filePath, content: document.getText() });
      if (Settings.diagnostics) {
        return this.provideDiagnostics();
      }
    } catch (e) {}
  }

  /**
   * Flushes the entire storage on deactivation or opening a new workspace
   */
  public flushStorage() {
    this.workSpaceRoot = undefined;
    this.tsConfig = new Map();
    this.cssModules = new Map();
  }

  private async provideDiagnostics() {
    const activeFileDir = path.parse(
      this.activeTextEditor.document.uri.fsPath
    ).dir;
    const activeFileUri = this.activeTextEditor.document.uri;
    if (Settings.diagnostics && this.parser) {
      this.diagnosticsProvider = new DiagnosticsProvider({
        parser: this.parser,
        activeFileDir,
        activeFileUri,
      });
      await this.diagnosticsProvider.runDiagnostics();
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
