import { promises as fs_promises } from "fs";
import path = require("path");
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  Range,
  TextDocument,
} from "vscode-css-languageservice";
import {
  MixinDeclaration,
  Node,
  NodeType,
  RuleSet,
  Stylesheet,
} from "../../css-node.types";

const getLanguageService = (module: string) => {
  switch (path.extname(module)) {
    case ".css":
      return getCSSLanguageService();
    case ".scss":
      return getSCSSLanguageService();
    default:
      return getCSSLanguageService();
  }
};
const getLanguageId = (module: string) => {
  switch (path.extname(module)) {
    case ".css":
      return "css";
    case ".scss":
      return "scss";
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
    return getSelectors(ast as Stylesheet, document);
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
            if (selector.indexOf(":") > -1) {
              selector = selector.split(":")[0];
            }
            let isInvalid = false;
            if (selector.startsWith("&-")) {
              const parentSelector = (parent as RuleSet)
                .getSelectors()
                .getText();
              const suffixSelector =
                parentSelector.replace(".", "") + selector.replace("&", "");
              selector = suffixSelector;
            } else if (selector.startsWith("&.")) {
              selector = selector.replace(/&./gi, "");
            } else if (selector.startsWith("& .")) {
              selector = selector.replace(/& ./gi, "");
            } else if (selector.startsWith(".")) {
              selector = selector.replace(".", "");
            } else {
              isInvalid = true;
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
