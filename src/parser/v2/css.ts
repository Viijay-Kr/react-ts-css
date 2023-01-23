import { promises as fs_promises } from "fs";
import path = require("path");
import {
  Position,
  Range as vscodeRange,
  Uri,
  TextDocument as vscode_TextDocument,
  Color,
} from "vscode";
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  TextDocument,
  Range,
  getLESSLanguageService,
  Stylesheet as unsafe_Stylesheet,
  ColorInformation,
  ColorPresentation,
} from "vscode-css-languageservice";
import { CssModuleExtensions } from "../../constants";
import {
  CustomPropertyDeclaration,
  MixinDeclaration,
  Node,
  NodeType,
  RuleSet,
  Stylesheet,
} from "../../css-node.types";
import { isColorString } from "../utils";

export const getLanguageService = (module: string) => {
  switch (path.extname(module) as CssModuleExtensions) {
    case ".css":
      return getCSSLanguageService();
    case ".scss":
      return getSCSSLanguageService();
    case ".less":
      return getLESSLanguageService();
    default:
      return getCSSLanguageService();
  }
};
export const getLanguageId = (module: string) => {
  switch (path.extname(module) as CssModuleExtensions) {
    case ".css":
      return "css";
    case ".scss":
      return "scss";
    case ".less":
      return "less";
    default:
      return "css";
  }
};
export type CssParserResult = {
  selectors: Map<string, Selector>;
  eofRange: vscodeRange;
  variables: Variable[];
  ast: Stylesheet;
  colors: ColorInformation[];
};

export const parseCss = async (
  module: string
): Promise<CssParserResult | undefined> => {
  try {
    const languageService = getLanguageService(module);
    const content = (await fs_promises.readFile(module)).toString();
    const document = TextDocument.create(
      module,
      getLanguageId(module),
      1,
      content
    );
    const ast = languageService.parseStylesheet(document);
    const selectors = getSelectors(ast as Stylesheet, document);
    const variables = getVariables(ast as Stylesheet, document);
    const colors = languageService.findDocumentColors(document, ast);
    const eofRange = new vscodeRange(
      new Position(document.lineCount + 2, 0),
      new Position(document.lineCount + 2, 0)
    );
    return { selectors, eofRange, variables, ast: ast as Stylesheet, colors };
  } catch (e) {
    console.error(e);
  }
};

export type Selector = {
  selector: string;
  range: Range;
  content: string;
  selectionRange: Range;
};

export type Variable = {
  name?: string;
  value?: string;
  kind: "color" | "normal";
  location: { range: Range; uri: Uri };
};

export const getSelectors = (ast: Stylesheet, document: TextDocument) => {
  const selectors: Map<string, Selector> = new Map();

  const insertSelector = (
    selectorNode: Node,
    parentNode: Node,
    selector: string
  ) => {
    if (selectors.has(selector)) {
      return;
    }
    const range = Range.create(
      document.positionAt(selectorNode.offset),
      document.positionAt(selectorNode.end)
    );
    const selectionRange = Range.create(
      document.positionAt(parentNode.offset),
      document.positionAt(parentNode.end)
    );
    selectors.set(selector, {
      selector,
      range,
      content: parentNode.getText(),
      selectionRange,
    });
  };

  function resolveSelectors(node: Node, parent: Node | null) {
    if (node.type === NodeType.Ruleset) {
      const selectorNodeList = (node as RuleSet).getSelectors();
      for (const selectorNode of selectorNodeList.getChildren()) {
        for (const simpleSelector of selectorNode.getChildren()) {
          if (simpleSelector.type === NodeType.SimpleSelector) {
            let selector = simpleSelector.getText();
            let isInvalid = false;
            if (selector.startsWith("&-")) {
              selector =
                resolveSuffixSelectors(parent, "") + selector.replace("&", "");
            } else if (selector.startsWith("&.")) {
              selector = selector.replace(/&./gi, "");
            } else if (selector.startsWith("& .")) {
              selector = selector.replace(/& ./gi, "");
            } else if (selector.startsWith(".")) {
              selector = selector.replace(".", "");
            } else {
              isInvalid = true;
            }
            if (selector.indexOf(":") > -1) {
              selector = selector.split(":")[0];
            }
            if (selector.indexOf(".") > -1) {
              for (const _selector of selector.split(".")) {
                insertSelector(selectorNode, node, _selector);
              }
            } else {
              if (!isInvalid) {
                insertSelector(selectorNode, node, selector);
              }
            }
          }
        }
      }
      const declarations = (node as RuleSet).declarations;
      if (declarations) {
        for (const child of declarations.getChildren()) {
          resolveSelectors(child, node);
        }
      }
    }
    if (node.type === NodeType.MixinDeclaration) {
      const declarations = (node as MixinDeclaration).declarations;
      if (declarations) {
        for (const child of declarations.getChildren()) {
          resolveSelectors(child, node);
        }
      }
    }
  }

  for (const child of ast.getChildren()) {
    resolveSelectors(child, null);
  }

  return selectors;
};

function resolveSuffixSelectors(parent: Node | null, suffixes: string): string {
  if (!parent) {
    return suffixes;
  }
  if (parent.type !== NodeType.Ruleset) {
    return resolveSuffixSelectors(parent.parent, suffixes);
  }
  const parentSelector = (parent as RuleSet).getSelectors().getText();
  if (parentSelector.startsWith("&-")) {
    suffixes = parentSelector.replace("&", "") + suffixes;
    return resolveSuffixSelectors(parent.parent, suffixes);
  }
  const suffixSelector = parentSelector.replace(".", "") + suffixes;
  return suffixSelector;
}

export const getVariables = (ast: Stylesheet, document: TextDocument) => {
  const variables: CssParserResult["variables"] = [];
  const resolveVariables = (node: Node) => {
    if (node.type === NodeType.CustomPropertyDeclaration) {
      const _node = node as CustomPropertyDeclaration;
      variables.push({
        name: _node.property?.getText(),
        value: _node.value?.getText(),
        kind: isColorString(_node.value?.getText() ?? "") ? "color" : "normal",
        location: {
          range: Range.create(
            document.positionAt(_node.value?.offset ?? _node.offset),
            document.positionAt(_node.value?.end ?? _node.end)
          ),
          uri: Uri.file(document.uri),
        },
      });
    }
    for (const child of node.getChildren()) {
      resolveVariables(child);
    }
  };
  for (const child of ast.getChildren()) {
    resolveVariables(child);
  }

  return variables;
};

export const createStyleSheet = (document: vscode_TextDocument): Stylesheet => {
  const _document = TextDocument.create(
    document.uri.path,
    getLanguageId(document.uri.path),
    1,
    document.getText()
  );
  const languageService = getLanguageService(document.uri.path);
  const ast = languageService.parseStylesheet(_document);
  return ast as Stylesheet;
};
