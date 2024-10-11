import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import {
  Identifier,
  isIdentifier,
  isImportDeclaration,
  isImportDefaultSpecifier,
  isStringLiteral,
  Statement,
  StringLiteral,
} from "@babel/types";
import path = require("path");
import { CssModuleExtensions, CSS_MODULE_EXTENSIONS } from "../../constants";

export const isCssModuleDeclaration = (value: string) => {
  const ext = path.extname(value) as CssModuleExtensions;
  return CSS_MODULE_EXTENSIONS.includes(ext);
};
type Accessor = {
  property: StringLiteral | Identifier;
  object: Identifier; // Should always be one of sourceIdentfiers
  isDynamic?: boolean;
};
export type ParserResult = {
  /** A list of default export identifier of a css module */
  style_identifiers: Identifier[];
  /** A list of import declrations in a given file */
  import_statements: Statement[];
  /** A list of ocurrances of all style object and their member experessions */
  style_accessors: Accessor[];
};

export const parseTypescript = (
  content: string,
): Promise<ParserResult | undefined> => {
  const ast = parse(content, {
    sourceType: "module",
    errorRecovery: true,
    plugins: ["jsx", "typescript"],
  });

  return new Promise((resolve, reject) => {
    try {
      const importDeclarations = ast.program.body.filter((node) =>
        isImportDeclaration(node),
      );
      const sourceIdentifiers: Identifier[] = [];
      const accessors: Accessor[] = [];
      for (const importStatement of importDeclarations) {
        if (
          isImportDeclaration(importStatement) &&
          isCssModuleDeclaration(importStatement.source.value)
        ) {
          for (const specifier of importStatement.specifiers) {
            if (isImportDefaultSpecifier(specifier)) {
              if (isIdentifier(specifier.local)) {
                sourceIdentifiers.push(specifier.local);
              }
            }
          }
        }
      }
      traverse(ast, {
        MemberExpression(path) {
          if (isIdentifier(path.node.object)) {
            const iName = path.node.object.name;
            const isPresent = sourceIdentifiers.some((s) => s.name === iName);
            if (isPresent) {
              if (
                isStringLiteral(path.node.property) ||
                isIdentifier(path.node.property)
              ) {
                accessors.push({
                  property: path.node.property,
                  object: path.node.object,
                  isDynamic:
                    isIdentifier(path.node.property) &&
                    content.charAt(
                      (path.node.property.loc?.start.index! as number) - 1,
                    ) === "[",
                });
              }
            }
          }
        },
        exit(path) {
          if (path.node.type === "Program") {
            resolve({
              style_identifiers: sourceIdentifiers,
              import_statements: importDeclarations,
              style_accessors: accessors,
            });
          }
        },
      });
    } catch (e) {}
  });
};
