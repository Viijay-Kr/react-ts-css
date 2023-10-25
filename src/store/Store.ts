import path = require("path");
import {
  languages,
  TextEditor,
  Uri,
  Progress,
  window,
  Range,
  workspace,
  StatusBarAlignment,
  StatusBarItem,
} from "vscode";
import {
  CssModuleExtensions,
  CSS_MODULE_EXTENSIONS,
  TS_MODULE_EXTENSIONS,
} from "../constants";
import * as fsg from "fast-glob";
import { promises as fs_promises } from "node:fs";
import Settings from "../settings";
import { ParsedResult, Parser } from "../parser/Parser";
import { DiagnosticsProvider } from "../providers/ts/diagnostics";
import { normalizePath } from "../path-utils";
import { parseCss } from "../parser/v2/css";

// Full file path of the active opened file
type CssModules = Map<string, Awaited<ReturnType<typeof parseCss>> | undefined>;
type TsModules = Map<string, ParsedResult | undefined>;

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
  public _parser: Parser | undefined;
  statusBarItem: StatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right
  );

  constructor() {
    this.statusBarItem.name = "React Css Modules";
    this.statusBarItem.text = "$(loading~spin) react-ts-css";
  }

  public get activeTextEditor(): TextEditor {
    const editor = window.activeTextEditor;
    if (!editor) {
      throw new Error("No Text editor found");
    }
    return editor;
  }

  public get workSpaceRoot(): string {
    if (!this._workSpaceRoot) {
      throw new Error("Workspace not initialised!");
    }
    return this._workSpaceRoot;
  }
  public set workSpaceRoot(v: string) {
    this._workSpaceRoot = v;
  }

  public get parser(): Parser {
    if (!this._parser) {
      throw new Error("Parser not initialised!");
    }
    return this._parser;
  }
  public set parser(v: Parser) {
    this._parser = v;
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
        this.cssModules.set(f.path, await parseCss(f.path));
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
  private setWorkSpaceRoot() {
    const uri = this.getActiveTextDocument().uri;
    const _uri = workspace.getWorkspaceFolder(uri)?.uri;
    const workspaceRoot = _uri?.fsPath;
    if (workspaceRoot) {
      this.workSpaceRoot = workspaceRoot;
    }
  }

  private setParser() {
    this.parser = new Parser({
      workspaceRoot: this.workSpaceRoot,
      tsConfig: this.tsJsConfig,
      baseDir: Settings.baseDir,
    });
  }

  private async setCssModules() {
    if (this.cssModules.size > 0) {
      return;
    }
    try {
      const uri = window.activeTextEditor?.document?.uri;
      if (uri) {
        const glob = `**/*.{${CSS_MODULE_EXTENSIONS.map((e) =>
          e.replace(".", "")
        ).join(",")}}`;
        const files = await fsg(glob, {
          cwd: this.workSpaceRoot,
          ignore: ["node_modules", "build", "dist", "coverage"],
          absolute: true,
        });
        await Promise.allSettled(
          files.map(async (file) =>
            this.cssModules.set(
              normalizePath(file),
              await parseCss(normalizePath(file))
            )
          )
        );
      }
    } catch (e) {
      // console.error(e);
    }
  }

  private async setTsJsModules() {
    if (this.tsModules.size) {
      return;
    }
    try {
      const uri = window.activeTextEditor?.document?.uri;
      if (uri) {
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
            "**/*/node_modules",
            "**/*/build",
            "**/*/dist",
            "**/*/coverage",
            "**/*/*.d.ts",
          ],
          absolute: true,
        });
        await Promise.allSettled(
          files.map(async (file) =>
            this.tsModules.set(
              file,
              await this.parser.parse({ filePath: file })
            )
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  private async parseCurrentDocument() {
    const document = this.activeTextEditor.document;
    const filePath = document.uri.fsPath;
    const ext = path.extname(filePath);
    console.log(ext);
    if (TS_MODULE_EXTENSIONS.includes(ext)) {
      this.parser.parsed_result = await this.parser.parse({
        filePath,
        content: document.getText(),
      });
      // @ts-expect-error
    } else if (CSS_MODULE_EXTENSIONS.includes(ext)) {
    }
  }

  private async compileDiagnostics() {
    if (Settings.diagnostics) {
      return await this.provideDiagnostics();
    }
  }

  public async bootstrap() {
    try {
      if (this.activeTextEditor.document.isDirty) {
        return;
      }

      this.setWorkSpaceRoot();
      this.setParser();
      this.statusBarItem.show();

      await this.saveTsJsConfig();
      await this.setCssModules();
      await this.setTsJsModules();
      await this.parseCurrentDocument();
      this.statusBarItem.text = "$(check) react-ts-css";
      return await this.compileDiagnostics();
    } catch (e) {
      // console.error(e);
    }
  }

  /**
   * Flushes the entire storage on deactivation or opening a new workspace
   */
  public flushStorage() {
    this.workSpaceRoot = "";
    this.tsJsConfig = new Map();
    this.cssModules = new Map();
  }

  private async provideDiagnostics() {
    const activeFileDir = path.parse(
      this.activeTextEditor.document.uri.fsPath
    ).dir;
    const activeFileUri = this.activeTextEditor.document.uri;
    if (Settings.diagnostics) {
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
