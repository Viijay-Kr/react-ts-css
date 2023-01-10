import { parse } from "@babel/parser";
import { isImportDeclaration, Program } from "@babel/types";

export const getImportDeclarations = (
  ast: ReturnType<typeof parse> | undefined
) => {
  if (!ast?.program) {
    return [];
  }
  return ast.program.body.filter((node) => isImportDeclaration(node));
};
