import {
  MarkdownString,
  Position,
  Range,
  TextDocument,
  TextEdit,
} from "vscode";
import Storage from "../storage/Storage";
import {
  extractClassName,
  filterChildSelector,
  filterParentSelector,
  filterSiblingSelector,
  filterSuffixedSelector,
  getSuffixesWithParent,
  getSymbolContent,
  getSymbolContentForHover,
  parseCss,
  scssSymbolMatcher,
} from "../parser/css";
import { SymbolInformation } from "vscode-css-languageservice";
import { ImportDeclaration, isImportDeclaration } from "@babel/types";
import { getImportDeclarations } from "../parser/utils";

export enum ProviderKind {
  Definition = 1,
  Completion = 2,
  Hover = 3,
  Invalid = -1,
}

export interface CompletionItemType {
  label: string;
  content?: MarkdownString;
  extras?: string;
  additionalEdits?: TextEdit[];
}

export interface SelectorCompletionItem extends CompletionItemType {
  type?: "root" | "suffix" | "child" | "sibling";
}

export interface ImportCompletionItem extends CompletionItemType {
  type?: "module";
  shortPath: string;
}
export class ProviderFactory {
  /** Dynamic CSS file which should be parsed for completion,definition and hover */
  public sourceCssFile: string | undefined;
  public providerKind: ProviderKind = ProviderKind.Invalid;
  /** Current Active Position in the Document */
  public position: Position;
  /** Current Active Text Document in focus */
  public document: TextDocument;

  public constructor(options: {
    providerKind: ProviderKind;
    position: Position;
    document?: TextDocument;
  }) {
    this.providerKind = options.providerKind;
    this.position = options.position;
    if (options.document) {
      this.document = options.document;
    } else {
      this.document = Storage.getActiveTextDocument();
    }
    this.setSourceCssFile(options.position);
  }

  /**
   * Set the source css file for processing provider results. The file is determined by the current position in the TextDocument and finding the available css import declarations in the Document
   * @param position [Position](#vscode.Position);
   */
  public setSourceCssFile(position: Position) {
    const nodeAtOffset = Storage.getNodeAtOffsetPosition(
      this.document,
      this.document.offsetAt(position)
    );
    const nodeByFile = Storage.getNodeByFileUri(this.document.fileName);
    const stylesIdentifier = nodeAtOffset?.object;
    const targetImport = nodeByFile?.sourceIdentifiers?.find(
      (s) => s.identifier.name === stylesIdentifier?.name
    )?.import;
    if (targetImport) {
      const files = Array.from(Storage.sourceFiles.keys());
      this.sourceCssFile = files.find((f) =>
        f.includes(targetImport.source.value.split("/").pop()!)
      );
    }
  }

  public async getAllSymbols() {
    if (!this.sourceCssFile) {
      return [];
    }
    const symbols = Storage.getCSSSymbols(this.sourceCssFile);
    if (!symbols) {
      // If not found in cache get it from a fresh parse
      const symbols = parseCss(this.sourceCssFile);
      Storage.setCssSymbols(this.sourceCssFile, symbols);
      return symbols;
    }
    return symbols;
  }

  public async getMatchedSelectors() {
    const symbols = await this.getAllSymbols();
    const nodeAtOffset = Storage.getNodeAtOffsetPosition(
      this.document,
      this.document.offsetAt(this.position)
    );
    if (!nodeAtOffset) {
      return [];
    }
    switch (nodeAtOffset.property.type) {
      case "Identifier":
        return scssSymbolMatcher(symbols, nodeAtOffset.property.name);
      case "StringLiteral":
        return scssSymbolMatcher(symbols, nodeAtOffset.property.value);
      default:
        return [];
    }
  }

  public async getSelectorsForCompletion() {
    const symbols = await this.getAllSymbols();
    const toCompletionItem =
      (type: SelectorCompletionItem["type"]) =>
      (s: SymbolInformation): SelectorCompletionItem => ({
        label: extractClassName(s),
        type,
        content: this.getSymbolContent(s),
      });

    const parentSelectors = symbols
      .filter(filterParentSelector)
      .map(toCompletionItem("root"));
    const childSelectors = symbols
      .filter(filterChildSelector)
      .map(toCompletionItem("child"));
    const siblingSelectots = symbols
      .filter(filterSiblingSelector)
      .map(toCompletionItem("sibling"));
    const suffixedSelectors = symbols
      .filter(filterSuffixedSelector)
      .map((s) => getSuffixesWithParent(symbols, s))
      .map(toCompletionItem("suffix"));

    return [
      ...parentSelectors,
      ...childSelectors,
      ...siblingSelectots,
      ...suffixedSelectors,
    ].reduce<SelectorCompletionItem[]>((acc, prev) => {
      if (!acc.find((s) => s.label === prev.label)) {
        return acc.concat(prev);
      }
      return acc;
    }, []);
  }
  public getOriginWordRange() {
    const document = this.document;
    const nodeAtOffset = Storage.getNodeAtOffsetPosition(
      this.document,
      document.offsetAt(this.position)
    );
    if (!nodeAtOffset) {
      return;
    }
    return new Range(
      new Position(
        nodeAtOffset.object.loc?.start.line! - 1,
        nodeAtOffset.object.loc?.start.column!
      ),
      new Position(
        nodeAtOffset.property.loc?.end.line! - 1,
        nodeAtOffset.property.loc?.end.column!
      )
    );
  }

  public getSymbolLocationRange(symbol: SymbolInformation) {
    return new Range(
      new Position(
        symbol.location.range.start.line,
        symbol.location.range.start.character
      ),
      new Position(
        symbol.location.range.end.line,
        symbol.location.range.end.character
      )
    );
  }

  public getSymbolContent(symbol: SymbolInformation) {
    if (!this.sourceCssFile) {
      throw new Error(
        "No source css file uri found. Did you create a ProviderFactory instance"
      );
    }
    return getSymbolContent(symbol);
  }

  public getSymbolContentForHover(symbol: SymbolInformation) {
    if (!this.sourceCssFile) {
      throw new Error(
        "No source css file uri found. Did you create a ProviderFactory instance"
      );
    }
    return getSymbolContentForHover(symbol);
  }

  public preProcessSelectorCompletions() {
    const currentRange = new Range(
      new Position(this.position.line, this.position.character),
      new Position(this.position.line, this.position.character)
    );
    const document = this.document;
    const nodeByFile = Storage.getNodeByFileUri(document.fileName);
    let targetDeclration: ImportDeclaration;
    nodeByFile?.sourceIdentifiers.forEach((i) => {
      if (targetDeclration) {
        return;
      }
      const identifier = i.identifier.name;
      const wordToMatch = document.getText(
        currentRange.with(
          new Position(
            this.position.line,
            this.position.character - identifier.length - 1
          ),
          new Position(this.position.line, this.position.character - 1)
        )
      );
      const match = wordToMatch.match(new RegExp(i.identifier.name));
      if (match) {
        targetDeclration = i.import;
      }
    });
    const files = Array.from(Storage.sourceFiles.keys());
    this.sourceCssFile = files.find((f) => {
      return f.includes(targetDeclration?.source.value.split("/").pop()!);
    });
  }

  public canCompleteImports() {
    // This method should handle the ability of the completion
    // Completion should be activated only when the trigger was made on a JSX attribute `className`
  }

  public async getImportCompletions() {
    const sourceFiles = Storage.sourceFiles;
    const activeFileuri = this.document.uri.path;
    const parserResult = Storage.getNodeOfActiveFile();
    const importStatements = getImportDeclarations(parserResult?.unsafe_ast);
    const lastImportStatement = importStatements[importStatements.length - 1];

    const buildAdditionalEdit = (
      module: string /** full path of the module */,
      moduleIdentifier: string
    ) => {
      const absolutePath = module.replace(Storage.workSpaceRoot + "/", "");
      const newText = `import ${moduleIdentifier} from '${absolutePath}'\n`;
      if (lastImportStatement?.loc) {
        return [
          TextEdit.insert(
            new Position(lastImportStatement.loc?.end.line, 0),
            newText
          ),
        ];
      } else {
        return [TextEdit.insert(new Position(0, 0), newText)];
      }
    };

    const filterOutExistingModules = (item: ImportCompletionItem) => {
      let isAlreadyExported = false;
      for (const statement of importStatements) {
        if (isImportDeclaration(statement)) {
          const name = statement.source.value;
          if (name.match(item.shortPath)?.index) {
            isAlreadyExported = true;
            break;
          }
        }
      }
      return !isAlreadyExported;
    };

    return Array.from(sourceFiles.keys())
      .map((uri): ImportCompletionItem => {
        const shortPath = uri.split("/").pop() ?? "";
        const moduleIdentifier =
          (shortPath.split(".")[0] ?? shortPath) + "_styles";
        return {
          label: moduleIdentifier,
          type: "module",
          shortPath,
          extras: uri,
          additionalEdits: buildAdditionalEdit(uri, moduleIdentifier),
        };
      })
      .filter((c) => filterOutExistingModules(c))
  }
}
