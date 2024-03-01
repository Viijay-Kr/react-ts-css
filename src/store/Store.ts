import path = require("path");
import { languages, TextEditor, Uri, window, Range, workspace } from "vscode";
import {
  CssModuleExtensions,
  CSS_MODULE_EXTENSIONS,
  TS_MODULE_EXTENSIONS,
} from "../constants";
import * as fsg from "fast-glob";
import { promises as fs_promises } from "node:fs";
import Settings from "../settings";
import { Parser } from "../parser/Parser";
import { DiagnosticsProvider } from "../providers/ts/diagnostics";
import { normalizePath } from "../path-utils";

// Full file path of the active opened file
type CssModules = Map<string, string>;
type TsModules = Map<string, string>;

export type TsJsConfig = {
  compilerOptions: {
    baseUrl?: string;
    paths?: {
      [key: string]: Array<string>;
    };
  };
  baseDir: string;
};

export type TsJsConfigMap = Map<string, TsJsConfig>;

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
  public tsJsConfig: TsJsConfigMap = new Map();
  public tsModules: TsModules = new Map();
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
      const exts = CSS_MODULE_EXTENSIONS.map((e) => e.replace(".", "")).join(
        ","
      );
      const glob = `**/*.{${exts}}`;
      const files = await fsg(glob, {
        cwd: this.workSpaceRoot,
        ignore: [
          "node_modules",
          "**/*/node_modules",
          "build",
          "**/*/build",
          "dist",
          "**/*/dist",
          "coverage",
        ],
        absolute: true,
      });
      files.forEach((file) =>
        this.cssModules.set(normalizePath(file), normalizePath(file))
      );
    }
  }

  private async experimental_setTsModules() {
    const uri = window.activeTextEditor?.document?.uri;
    if (uri) {
      if (!this.workSpaceRoot) {
        const _uri = workspace.getWorkspaceFolder(uri)?.uri;
        const workspaceRoot = _uri?.fsPath;
        this.workSpaceRoot = workspaceRoot;
      }
      const glob = `**/*.{${TS_MODULE_EXTENSIONS.map((e) =>
        e.replace(".", "")
      ).join(",")}}`;
      const files = await fsg(glob, {
        cwd: this.workSpaceRoot,
        ignore: [
          "node_modules",
          "build",
          "dist",
          "coverage",
          "*.d.ts",
          "**/*/.config.ts",
          "**/*/.config.js",
          "**/*/node_modules",
          "**/*/build",
          "**/*/dist",
          "**/*/coverage",
          "**/*/*.d.ts",
          "**/*/*.test.ts",
          "**/*/*.test.tsx",
          "**/*/*.stories.tsx",
          "**/*/*.story.tsx",
        ],
        absolute: true,
      });
      files.forEach((file) => this.tsModules.set(file, file));
    }
  }

  private async saveTsJsConfig() {
    try {
      const configs = await fsg(
        [
          "**/*/tsconfig.json",
          "tsconfig.json",
          "**/*/jsconfig.json",
          "jsconfig.json",
        ],
        {
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
        }
      );
      await Promise.allSettled(
        configs.map(async (config) => {
          const _path = path.resolve(this.workSpaceRoot ?? "", config);
          const contents = (await fs_promises.readFile(_path)).toString();
          try {
            this.tsJsConfig.set(_path, {
              ...JSON.parse(contents),
              baseDir: normalizePath(
                path.join(this.workSpaceRoot ?? "", path.dirname(config))
              ),
            } as TsJsConfig);
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
    for (const [, config] of this.tsJsConfig) {
      if (activeFileDir.includes(config.baseDir)) {
        const alias = normalizePath(path.dirname(source));
        const module_name = path.basename(source);
        const paths = config.compilerOptions.paths;
        const baseUrl = config.compilerOptions.baseUrl;
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

        for (const [_path, values] of Object.entries(paths ?? {})) {
          const alias_dir_path = normalizePath(path.dirname(_path));
          let final_path = "";
          const alias_value = values[0].replace("*", "");
          if (alias === alias_dir_path) {
            final_path = normalizePath(
              path.join(
                config.baseDir,
                config.compilerOptions.baseUrl ?? "",
                alias_value,
                module_name
              )
            );
          } else if (alias.indexOf(alias_dir_path) === 0) {
            final_path = normalizePath(
              path.join(
                config.baseDir,
                alias_value,
                alias.replace(alias_dir_path, ""),
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

      if (!this.tsModules.size) {
        await this.experimental_setTsModules();
      }

      await this.saveTsJsConfig();

      if (!this.parser) {
        this.parser = new Parser({
          workspaceRoot: this.workSpaceRoot,
          tsConfig: this.tsJsConfig,
          baseDir: Settings.baseDir,
        });
      }

      const document = this.activeTextEditor.document;
      const filePath = document.uri.fsPath;
      this.parser.parsed_result = await this.parser?.parse({
        filePath,
        content: document.getText(),
      });
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
    this.tsJsConfig = new Map();
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
