import {
  isImportDeclaration,
  isImportDefaultSpecifier,
  isIdentifier,
} from "@babel/types";
import path = require("path");
import { MODULE_EXTENSIONS } from "../constants";
import { normalizePath } from "../path-utils";
import Store, { StyleReferences, TsConfigMap } from "../store/Store";
import { parseCss } from "./v2/css";
import { isCssModuleDeclaration, parseTypescript } from "./v2/ts";
import Settings from "../settings";

export type ParserContext = {
  workspaceRoot: string | undefined;
  tsConfig: TsConfigMap;
  baseDir: string | undefined;
  cssModules: typeof Store.cssModules;
};

export class Parser {
  context: ParserContext;
  constructor(ctx: ParserContext) {
    this.context = ctx;
  }

  private resolveCssFilePath(source: string, filePath: string) {
    const {
      cssModules: sourceFiles,
      workspaceRoot = "",
      baseDir = "",
    } = this.context;
    const activeFileDir = path.dirname(filePath);
    const isRelativePath = source.startsWith(".");
    const isTsConfigAlias = source.startsWith(Settings.tsconfigPathPrefix ?? "");
    const doesModuleExists = (pathOfSource: string) =>
      sourceFiles.has(pathOfSource);
    if (isRelativePath) {
      const relativePathOfSource = normalizePath(
        path.resolve(activeFileDir, source)
      );
      if (doesModuleExists(relativePathOfSource)) {
        return relativePathOfSource;
      }
    } else if (isTsConfigAlias) {
      const aliasedModule = Store.resolveCssModuleAlias(source);
      if (aliasedModule && Store.cssModules.has(aliasedModule)) {
        return aliasedModule;
      }

    } else {
      let absolutePathOfSource = normalizePath(
        path.resolve(workspaceRoot, source)
      );
      if (doesModuleExists(absolutePathOfSource)) {
        return absolutePathOfSource;
      }
      // as a last resort find the path using tsconfig.compilerOptions.base or base setting
      absolutePathOfSource = normalizePath(
        path.resolve(workspaceRoot, baseDir, source)
      );
      if (doesModuleExists(absolutePathOfSource)) {
        return absolutePathOfSource;
      }
    }
  }
  async parse({ filePath, content }: { filePath: string; content: string }) {
    const { workspaceRoot } = this.context;
    if (MODULE_EXTENSIONS.includes(path.extname(filePath))) {
      const parsedResult = await parseTypescript(content);
      if (parsedResult && workspaceRoot) {
        const style_references: StyleReferences["style_references"] = new Map();
        for (const statements of parsedResult.import_statements) {
          if (
            isImportDeclaration(statements) &&
            isCssModuleDeclaration(statements.source.value)
          ) {
            const sourceCssFile = this.resolveCssFilePath(
              statements.source.value,
              filePath
            );
            if (sourceCssFile) {
              const result = await this.buildSelectorsSet(sourceCssFile);
              let styleIdentifier = "";
              for (const specifier of statements.specifiers) {
                if (isImportDefaultSpecifier(specifier)) {
                  if (isIdentifier(specifier.local)) {
                    styleIdentifier = specifier.local.name;
                  }
                }
              }
              if (result && styleIdentifier) {
                style_references.set(styleIdentifier, {
                  uri: sourceCssFile,
                });
              }
            }
          }
        }
        return {
          parsedResult,
          style_references,
        };
      }
    }
  }

  private async buildSelectorsSet(cssModule: string) {
    return await parseCss(cssModule);
  }
}
