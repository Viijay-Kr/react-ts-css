import { promises as fs_promises } from "fs";
import path = require("path");
import {
  Position,
  Range as vscodeRange,
  Uri,
  TextDocument as vscode_TextDocument,
} from "vscode";
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  TextDocument,
  Range,
  getLESSLanguageService,
  ColorInformation,
} from "vscode-css-languageservice";
import { CssModuleExtensions } from "../../constants";
import {
  CustomPropertyDeclaration,
  Node,
  NodeType,
  RuleSet,
  Stylesheet,
} from "../../css-node.types";
import {
  isChild,
  isColorString,
  isCombination,
  isNormal,
  isPsuedo,
  isSibling,
  isSuffix,
} from "../utils";
import Store from "../../store/Store";

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
    Store.outputChannel.error(
      `CSSParserError: Parsing css module ${module} failed`
    );
  }
};

export type Selector = {
  selector: string;
  range: Range;
  content: string;
  selectionRange: Range;
  rule: string;
};

export type Variable = {
  name?: string;
  value?: string;
  kind: "color" | "normal";
  location: {
    value_range: Range;
    uri: Uri;
    full_range: Range;
    property_range: Range;
  };
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
      rule: selectorNode.getText(),
    });
  };

  function resolveSelectors(node: Node, parent: Node | null) {
    switch (node.type) {
      case NodeType.Ruleset: {
        const selectorNodeList = (node as RuleSet).getSelectors();
        for (const selectorNode of selectorNodeList.getChildren()) {
          for (const simpleSelector of selectorNode.getChildren()) {
            if (simpleSelector.type === NodeType.SimpleSelector) {
              let selector = simpleSelector.getText();
              let isInvalid = false;
              if (isSuffix(selector)) {
                selector =
                  resolveSuffixSelectors(parent, "") +
                  selector.replace("&", "");
              } else if (isSibling(selector)) {
                selector = selector.replace(/&./gi, "");
              } else if (isChild(selector)) {
                selector = selector.replace(/& ./gi, "");
              } else if (isNormal(selector)) {
                selector = selector.replace(".", "");
              } else {
                isInvalid = true;
              }
              if (isPsuedo(selector)) {
                selector = selector.split(":")[0];
              }
              if (isCombination(selector)) {
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
        break;
      }
    }
    for (const child of node.getChildren()) {
      resolveSelectors(child, node);
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
  if (isSuffix(parentSelector)) {
    suffixes = parentSelector.replace("&", "") + suffixes;
    return resolveSuffixSelectors(parent.parent, suffixes);
  }
  const suffixSelector = parentSelector.replace(".", "") + suffixes;
  return suffixSelector;
}

export const getVariables = (ast: Stylesheet, document: TextDocument) => {
  const variables: CssParserResult["variables"] = [];
  ast.accept((node) => {
    if (node.type === NodeType.CustomPropertyDeclaration) {
      const _node = node as CustomPropertyDeclaration;
      variables.push({
        name: _node.property?.getText(),
        value: _node.value?.getText(),
        kind: isColorString(_node.value?.getText() ?? "") ? "color" : "normal",
        location: {
          value_range: Range.create(
            document.positionAt(_node.value?.offset ?? _node.offset),
            document.positionAt(_node.value?.end ?? _node.end)
          ),
          full_range: Range.create(
            document.positionAt(_node.offset),
            document.positionAt(_node.end)
          ),
          property_range: Range.create(
            document.positionAt(_node.property?.offset ?? _node.offset),
            document.positionAt(_node.property?.end ?? _node.end)
          ),
          uri: Uri.file(document.uri),
        },
      });
    }
    return true;
  });

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
