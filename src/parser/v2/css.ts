import { promises as fs_promises } from "fs";
import path = require("path");
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  Range,
  TextDocument,
} from "vscode-css-languageservice";
import { Node, NodeType, RuleSet, Stylesheet } from "../../css-node.types";

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
};

export const getSelectors = (ast: Stylesheet, document: TextDocument) => {
  const selectors: Map<string, Selector> = new Map();

  function resolveRuleSet(node: Node, parent: Node | null) {
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
                if (selectors.has(_selector)) {
                  continue;
                }
                const range = Range.create(
                  document.positionAt(selectorNode.offset),
                  document.positionAt(selectorNode.end)
                );
                selectors.set(_selector, {
                  selector,
                  range,
                  content: node.getText(),
                });
              }
            } else {
              if (!isInvalid && !selectors.has(selector)) {
                const range = Range.create(
                  document.positionAt(selectorNode.offset),
                  document.positionAt(selectorNode.end)
                );
                selectors.set(selector, {
                  selector,
                  range,
                  content: node.getText(),
                });
              }
            }
          }
        }
      }
      const declarations = (node as RuleSet).declarations;
      if (declarations) {
        for (const child of declarations.getChildren()) {
          resolveRuleSet(child, node);
        }
      }
    }
  }

  for (const child of ast.getChildren()) {
    if (child.type === NodeType.Ruleset) {
      resolveRuleSet(child, null);
    }
  }

  return selectors;
};
