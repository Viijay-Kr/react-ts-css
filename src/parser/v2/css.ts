import { promises as fs_promises } from "fs";
import path = require("path");
import { Position, Range as vscodeRange } from "vscode";
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  TextDocument,
  Range,
  getLESSLanguageService,
} from "vscode-css-languageservice";
import { CssModuleExtensions } from "../../constants";
import {
  MixinDeclaration,
  Node,
  NodeType,
  RuleSet,
  SimpleSelector,
  Stylesheet,
} from "../../css-node.types";

const getLanguageService = (module: string) => {
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
const getLanguageId = (module: string) => {
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
export const parseCss = async (module: string) => {
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
    const eofRange = new vscodeRange(
      new Position(document.lineCount + 2, 0),
      new Position(document.lineCount + 2, 0)
    );
    return { selectors, eofRange };
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
