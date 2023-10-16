import { promises as fs_promises } from "fs";
import {
  isImportDeclaration,
  isImportDefaultSpecifier,
  isIdentifier,
  Identifier,
} from "@babel/types";
import path = require("path");
import { TS_MODULE_EXTENSIONS } from "../constants";
import { normalizePath } from "../path-utils";
import Store, { TsJsConfigMap } from "../store/Store";
import { parseCss } from "./v2/css";
import { ParserResult, isCssModuleDeclaration, parseTypescript } from "./v2/ts";

type StyleIdentifier = Identifier["name"];

export type ParserContext = {
  workspaceRoot: string | undefined;
  tsConfig: TsJsConfigMap;
  baseDir: string | undefined;
};

export type StyleReferences = {
  style_references: Map<
    StyleIdentifier,
    {
      uri: string;
    }
  >;
};
type ParsedResult = {
  parsedResult: ParserResult;
  style_references: StyleReferences["style_references"];
};

export class Parser {
  context: ParserContext;

  parsed_result: ParsedResult | undefined;

  constructor(ctx: ParserContext) {
    this.context = ctx;
  }

  /**
   *
   * @param offset number
   * @returns ParserResult['unsafe_identifiers'] | undefined
   */
  public getAccessorAtOffset(offset: number) {
    if (this.parsed_result?.parsedResult) {
      return this.parsed_result.parsedResult.style_accessors?.find(
        ({ property: n, object: o }) =>
          (n?.start! <= offset && offset <= n?.end!) ||
          (o?.start! <= offset && offset <= o?.end!)
      );
    }
    return undefined;
  }

  private resolveCssFilePath(source: string, filePath: string) {
    const { workspaceRoot = "", baseDir = "" } = this.context;
    const sourceFiles = Store.cssModules;
    const activeFileDir = path.dirname(filePath);
    const isRelativePath = source.startsWith(".");
    const doesModuleExists = (pathOfSource: string) =>
      sourceFiles.has(pathOfSource);
    if (isRelativePath) {
      const relativePathOfSource = normalizePath(
        path.resolve(activeFileDir, source)
      );
      if (doesModuleExists(relativePathOfSource)) {
        return relativePathOfSource;
      }
    } else {
      let absolutePathOfSource = normalizePath(
        path.resolve(workspaceRoot, source)
      );
      if (doesModuleExists(absolutePathOfSource)) {
        return absolutePathOfSource;
      }

      // as a last resort find the path using tsconfig.compilerOptions.base or base setting
      const aliasedModule = Store.resolveCssModuleAlias(source);
      if (aliasedModule && Store.cssModules.has(aliasedModule)) {
        return aliasedModule;
      }
      absolutePathOfSource = normalizePath(
        path.resolve(workspaceRoot, baseDir, source)
      );
      if (doesModuleExists(absolutePathOfSource)) {
        return absolutePathOfSource;
      }
    }
  }

  async parse({ filePath, content }: { filePath: string; content?: string }) {
    const { workspaceRoot } = this.context;
    const contents =
      content ?? (await fs_promises.readFile(filePath)).toString();

    if (TS_MODULE_EXTENSIONS.includes(path.extname(filePath))) {
      const parsedResult = await parseTypescript(contents);
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

  public async getParsedResultByFile(f: string) {
    return await this.parse({ filePath: f });
  }
}
