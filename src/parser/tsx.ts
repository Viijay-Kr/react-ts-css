/* eslint-disable no-console */
import { parse, ParseResult } from "@babel/parser";
import traverse, { Scope } from "@babel/traverse";
import { Identifier, ImportDeclaration, StringLiteral } from "@babel/types";

export interface SourceIdentifier {
  identifier: Identifier;
  import: ImportDeclaration;
}

export interface ParserResult {
  sourceIdentifiers: SourceIdentifier[];
  unsafe_identifiers?: Array<{
    property: StringLiteral | Identifier;
    object: Identifier; // This should Always be a style identifier
  }>;
}

export const parseActiveFile = (
  content: string
): Promise<ParserResult | undefined> => {
  try {
    const ast = parse(content, {
      sourceType: "module",
      errorRecovery: true,
      plugins: ["jsx", "typescript"],
    });
    const sourceIdentifiers: SourceIdentifier[] = [];
    const unsafe_identifiers: ParserResult["unsafe_identifiers"] = [];
    return new Promise((resolve, reject) => {
      try {
        traverse(ast, {
          ImportDeclaration(path) {
            if (
              path.node.source.value.endsWith(".css") ||
              path.node.source.value.endsWith(".scss")
            ) {
              const importNode = path.node;
              const scope = new Scope(path, path.scope);
              scope.traverse(path.node, {
                Identifier(path) {
                  sourceIdentifiers.push({
                    import: importNode,
                    identifier: path.node,
                  });
                },
              });
            }
          },
          MemberExpression(path) {
            if (path.node.object.type === "Identifier") {
              const iName = path.node.object.name;
              const isPresent = sourceIdentifiers.some(
                (s) => s.identifier.name === iName
              );
              if (isPresent) {
                if (
                  path.node.property.type === "StringLiteral" ||
                  path.node.property.type === "Identifier"
                ) {
                  unsafe_identifiers.push({
                    property: path.node.property,
                    object: path.node.object,
                  });
                }
              }
            }
          },
          exit(path) {
            if (path.node.type === "Program") {
              resolve({
                sourceIdentifiers,
                unsafe_identifiers,
              });
            }
          },
        });
      } catch (e) {
        reject("Parsing the active file failed");
        throw e;
      }
    });
  } catch (e) {
    throw e;
  }
};
