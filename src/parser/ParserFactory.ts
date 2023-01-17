import {
  isImportDeclaration,
  isImportDefaultSpecifier,
  isIdentifier,
} from "@babel/types";
import path = require("path");
import { TextDocument, Uri } from "vscode";
import { TS_MODULE_EXTENSIONS } from "../constants";
import Storage_v2, { Selectors, TsConfig } from "../storage/Storage_v2";
import { parseCss } from "./v2/css";
import { isCssModuleDeclaration, parseActiveFile } from "./v2/tsx";

export type ParserContext = {
  workspaceRoot: string | undefined;
  tsConfig: TsConfig;
  document: TextDocument;
  baseDir: string | undefined;
  sourceFiles: Map<string, boolean>;
};

export class ParserFactory {
  context: ParserContext;
  constructor(ctx: ParserContext) {
    this.context = ctx;
  }

  private resolveCssFilePath(source: string) {
    const {
      document,
      sourceFiles,
      workspaceRoot = "",
      baseDir = "",
    } = this.context;
    const activeFileDir = path.dirname(document.uri.path);
    const isRelativePath = source.startsWith(".");
    const doesModuleExists = (pathOfSource: string) =>
      sourceFiles.has(pathOfSource);
    if (isRelativePath) {
      const relativePathOfSource = path.resolve(activeFileDir, source);
      if (doesModuleExists(relativePathOfSource)) {
        return relativePathOfSource;
      }
    } else {
      let absolutePathOfSource = path.resolve(workspaceRoot, source);
      if (doesModuleExists(absolutePathOfSource)) {
        return absolutePathOfSource;
      }
      // as a last resort find the path using tsconfig.compilerOptions.base or base setting
      absolutePathOfSource = path.resolve(
        workspaceRoot + "/" + baseDir,
        source
      );
      if (doesModuleExists(absolutePathOfSource)) {
        return absolutePathOfSource;
      }
    }
  }
  async parse() {
    const { workspaceRoot, document } = this.context;
    if (TS_MODULE_EXTENSIONS.includes(path.extname(document.uri.path))) {
      const parsedResult = await parseActiveFile(document.getText());
      if (parsedResult && workspaceRoot) {
        const selectors: Selectors["selectors"] = new Map();
        for (const statements of parsedResult.import_statements) {
          if (
            isImportDeclaration(statements) &&
            isCssModuleDeclaration(statements.source.value)
          ) {
            const sourceCssFile = this.resolveCssFilePath(
              statements.source.value
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
        return {
          parsedResult,
          selectors,
        };
      }
    }
  }

  private async buildSelectorsSet(cssModule: string) {
    return await parseCss(cssModule);
  }
}
