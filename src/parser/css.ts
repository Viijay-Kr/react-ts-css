import { readFileSync } from "fs";
import { MarkdownString } from "vscode";
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  SymbolInformation,
  SymbolKind,
  TextDocument,
} from "vscode-css-languageservice";
import Storage from "../storage/Storage";

const scssLs = getSCSSLanguageService();
const cssLs = getCSSLanguageService();

export const getLanguageService = (uri: string) => {
  if (uri.endsWith(".scss")) {
    return scssLs;
  } else {
    return cssLs;
  }
};

export const fileExt = (uri: string) => {
  if (uri.endsWith(".css")) {
    return "css";
  }
  if (uri.endsWith(".scss")) {
    return "scss";
  }
  return "css";
};

export const parseSymbols = (uri: string, content: string) => {
  const languageId = fileExt(uri);
  const document = TextDocument.create(uri, languageId, 1, content);
  const ast = (() => {
    if (languageId === "css") {
      return cssLs.parseStylesheet(document);
    }
    if (languageId === "scss") {
      return scssLs.parseStylesheet(document);
    }
    return cssLs.parseStylesheet(document);
  })();
  const ls = getLanguageService(uri);
  let symbols = ls.findDocumentSymbols(document, ast);
  if (languageId === "css") {
    // resolve css selectors here
    symbols = resolveCssSelectors(symbols);
  }
  return symbols.filter(filterSelectorKindSymbol).map(removePsuedoContent);
};

export const parseDocumentLinks = (
  uri: string,
  content: string,
  resolved: Array<string | undefined> = []
) => {
  const languageId = fileExt(uri);
  const document = TextDocument.create(uri, languageId, 1, content);
  const ast = (() => {
    if (languageId === "css") {
      return cssLs.parseStylesheet(document);
    }
    if (languageId === "scss") {
      return scssLs.parseStylesheet(document);
    }
    return cssLs.parseStylesheet(document);
  })();
  const ls = getLanguageService(uri);
  return ls
    .findDocumentLinks(document, ast, {
      resolveReference(_ref) {
        if (resolved.includes(_ref)) {
          return undefined;
        }
        const target = Array.from(Storage.sourceFiles.keys()).find((f) =>
          f.match(new RegExp(_ref))
        );
        return target;
      },
    })
    .filter((l) => {
      if (l.target) {
        return l.target.endsWith(".css") || l.target.endsWith(".scss");
      }
      return false;
    });
};
export const parseCss = (
  uri: string | undefined,
  resolved: (string | undefined)[] = []
): SymbolInformation[] => {
  if (!uri || !uri.includes(Storage.workSpaceRoot ?? "")) {
    return [];
  }
  const fileContent = readFileSync(uri).toString();
  const symbols = parseSymbols(uri, fileContent);
  const documentLinks = parseDocumentLinks(uri, fileContent, resolved);
  if (!documentLinks.length) {
    return symbols;
  }
  const finalSymbols = symbols.concat(
    documentLinks
      .map((link) => parseCss(link.target, [...resolved, link.target]))
      .flat()
  );
  return finalSymbols;
};

export const scssSymbolMatcher = (
  symbols: SymbolInformation[],
  target: string
) => {
  const allSelectors = symbols.filter(filterAllSelector);
  const suffixSelectors = symbols.filter(filterSuffixedSelector);
  const childSelectors = symbols.filter(filterChildSelector);
  const siblingsSelectors = symbols.filter(filterSiblingSelector);

  const finalSelectors = [
    ...allSelectors,
    ...childSelectors,
    ...siblingsSelectors,
  ].filter((s) => extractClassName(s) === target);

  const suffixSelector =
    suffixSelectors[
      (() => {
        let prevMatchIndex = -1;
        let symbolIndex = -1;
        suffixSelectors.forEach((s, i) => {
          const suffix = s.name.replace(/^(.*?)&/g, "");
          const match = target.match(suffix)?.index;
          if (typeof match !== "undefined") {
            if (prevMatchIndex === -1) {
              prevMatchIndex = match;
              symbolIndex = i;
            }
            if (match < prevMatchIndex) {
              prevMatchIndex = match;
              symbolIndex = i;
            }
          }
        });
        return symbolIndex;
      })()
    ];

  if (finalSelectors.length) {
    return finalSelectors;
  }
  if (suffixSelector) {
    return [suffixSelector];
  }
  return [];
};

// TODO: Deprecate this function
export const getSymbolContent = (symbol: SymbolInformation) => {
  const fileContent = readFileSync(symbol.location.uri).toString();
  const document = TextDocument.create(
    symbol.location.uri,
    fileExt(symbol.location.uri) === "scss" ? "sass" : "css",
    1,
    fileContent
  );
  const symbolContent = document.getText(symbol.location.range);

  return new MarkdownString("", true).appendCodeblock(
    symbolContent,
    fileExt(symbol.location.uri) === "scss" ? "sass" : "css"
  );
};

export const getSymbolContentForHover = (symbol: SymbolInformation) => {
  const fileContent = readFileSync(symbol.location.uri).toString();
  const document = TextDocument.create(
    symbol.location.uri,
    fileExt(symbol.location.uri) === "scss" ? "sass" : "css",
    1,
    fileContent
  );
  const symbolContent = document.getText(symbol.location.range);
  return {
    content: symbolContent,
    language: fileExt(symbol.location.uri),
  };
};

// This helper assumes the symbol you are trying to parse is a scss symbol
export const getSuffixesWithParent = (
  symbols: SymbolInformation[],
  suffix: SymbolInformation
) => {
  let newSuffix = {
    ...suffix,
  };
  symbols.filter(filterAllSelector).forEach((s) => {
    const content = getSymbolContent(s);
    const symbols = parseSymbols(s.location.uri, content.value);
    const match = symbols.find((sy) => sy.name === suffix.name);
    if (match) {
      newSuffix.name = (s.name + suffix.name).replace("&", "");
      return;
    }
  });
  return newSuffix;
};
export const isNormalSelector = (s: SymbolInformation) =>
  filterSelectorKindSymbol(s) && s.name.replace(/^&/g, "").startsWith(".");
export const filterAllSelector = (s: SymbolInformation) => isNormalSelector(s);

export const isSuffixedSelector = (s: SymbolInformation) =>
  filterSelectorKindSymbol(s) &&
  s.name.replace(/^&/g, "").match(/^-|^[__]|^[--]/g);
export const filterSuffixedSelector = (s: SymbolInformation) =>
  isSuffixedSelector(s);

export const isChildSelector = (s: SymbolInformation) =>
  filterSelectorKindSymbol(s) && s.name.startsWith("& .");
export const filterChildSelector = (s: SymbolInformation) => isChildSelector(s);

export const isSiblingSelector = (s: SymbolInformation) =>
  filterSelectorKindSymbol(s) && s.name.startsWith("&.");
export const filterSiblingSelector = (s: SymbolInformation) =>
  isSiblingSelector(s);

export const isRootSelector = (s: SymbolInformation) =>
  filterSelectorKindSymbol(s) && s.name.startsWith(".");
export const filterParentSelector = (s: SymbolInformation) => isRootSelector(s);

export const extractClassName = (s: SymbolInformation) =>
  s.name.replace(/^(?:\&\s*\.)|^(?:\.)/g, "");

export const filterSelectorKindSymbol = (s: SymbolInformation) =>
  s.kind === SymbolKind.Class;

export const removePsuedoContent = (s: SymbolInformation) => {
  const position = s.name.indexOf(":");
  if (position !== -1) {
    const content = s.name.substring(position, s.name.length);
    s.name = s.name.replace(new RegExp(content), "");
  }
  return s;
};

// **This function will definitely screw things up **//
// TODO: Optimize this function
export const resolveCssSelectors = (symbols: SymbolInformation[]) => {
  let childSelectors = symbols.filter((s) => s.name.match(/(?:\>\s*\.)/g));
  let siblings = symbols.filter(
    (s) => s.name.match(/\./g)?.length === 2 && !s.name.match(/(?:\s\.)/g)
  );

  const rootSelectors = symbols.filter(
    (s) =>
      !childSelectors.find((cs) => cs.name === s.name) &&
      !siblings.find((ss) => ss.name === s.name)
  );

  const createSymbols = (
    rest: string[],
    cs: SymbolInformation,
    container: string
  ) => {
    const newSymbols: SymbolInformation[] = [];
    // rest can have siblings so its necessary to split them out
    const separated = rest
      .map((r) => {
        if (!r.match(/(?:\s\.)/g)) {
          return r.split(".");
        }
        return [r];
      })
      .filter((s) => s !== undefined)
      .flat();
    separated.forEach((s) => {
      if (!rootSelectors.find((rs) => rs.name === `.${s}`)) {
        // create a symbold for the child here
        const symbol = SymbolInformation.create(
          `.${s}`,
          SymbolKind.Class,
          cs.location.range,
          cs.location.uri,
          container
        );
        newSymbols.push(symbol);
      }
    });
    return newSymbols;
  };
  childSelectors = childSelectors
    .map((cs) => {
      const [container, ...rest] = cs.name.split(/(?:\>\s*\.)|(?:\s\.)/g);
      return createSymbols(rest, cs, container);
    })
    .flat();
  siblings = siblings
    .map((ss) => {
      const [container, ...rest] = ss.name.split(/\./g);
      return createSymbols(rest, ss, container);
    })
    .flat();
  return [...rootSelectors, ...childSelectors, ...siblings];
};
