import {
  Diagnostic,
  MarkdownString,
  Position,
  Range,
  TextDocument,
  TextEdit,
  languages,
  DiagnosticSeverity,
  SymbolKind,
} from "vscode";
import Storage_v2 from "../storage/Storage_v2";
import {
  isIdentifier,
  isImportDeclaration,
  isStringLiteral,
} from "@babel/types";
import { basename, parse as parsePath, relative } from "path";
import { normalizePath } from "../path-utils";
import { DocumentSymbol, SymbolInformation } from "vscode-css-languageservice";
import { CssParserResult } from "../parser/v2/css";

export enum ProviderKind {
  Definition = 1,
  Completion = 2,
  Hover = 3,
  CODE_ACTIONS = 4,
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
      this.document = Storage_v2.getActiveTextDocument();
    }
  }

  public getMatchedSelector() {
    const accessorAtOffset = Storage_v2.getAccessorAtOffset(
      this.document,
      this.document.offsetAt(this.position)
    );
    if (!accessorAtOffset) {
      return;
    }
    const allSelectors = Storage_v2.getSelectorsByIdentifier(
      accessorAtOffset.object.name
    );
    if (allSelectors) {
      if (isIdentifier(accessorAtOffset.property)) {
        const selector = allSelectors.selectors.get(
          accessorAtOffset.property.name
        );
        return {
          selector,
          uri: allSelectors.uri,
        };
      }
      if (isStringLiteral(accessorAtOffset.property)) {
        const selector = allSelectors.selectors.get(
          accessorAtOffset.property.value
        );
        return {
          selector,
          uri: allSelectors.uri,
        };
      }
    }
  }

  public getOriginWordRange() {
    const document = this.document;
    const nodeAtOffset = Storage_v2.getAccessorAtOffset(
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

  public getSelecotorsForCompletion() {
    const document = this.document;
    const currentRange = new Range(
      new Position(this.position.line, this.position.character),
      new Position(this.position.line, this.position.character)
    );
    const node = Storage_v2.getParsedResultByFilePath();
    let natched_identifier = "";
    if (node) {
      for (const identifier of node.style_identifiers) {
        const wordToMatch = document.getText(
          currentRange.with(
            new Position(
              this.position.line,
              this.position.character - identifier.name.length - 1
            ),
            new Position(this.position.line, this.position.character - 1)
          )
        );
        const match = wordToMatch.match(new RegExp(identifier.name));
        if (match) {
          natched_identifier = identifier.name;
          break;
        }
      }
    }
    if (!natched_identifier) {
      return;
    }
    return Storage_v2.getSelectorsByIdentifier(natched_identifier);
  }

  public async getImportForCompletions() {
    const activeFileuri = this.document.uri.fsPath;
    const activePathInfo = parsePath(activeFileuri);
    const parsedResult = Storage_v2.getParsedResultByFilePath();
    const currentDir = normalizePath(activePathInfo.dir);
    const importStatements = parsedResult?.import_statements;
    const lastImportStatement = importStatements?.[importStatements.length - 1];

    const buildAdditionalEdit = (
      module: string /** full path of the module */
    ) => {
      const modulePathInfo = parsePath(module);
      const activePathInfo = parsePath(activeFileuri);
      const relativePath = normalizePath(
        relative(activePathInfo.dir, modulePathInfo.dir)
      );
      const newText = `import styles from '${
        relativePath === "" ? "./" : relativePath
      }${modulePathInfo.base}';\n`;

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

    const shouldInclude = (uri: string): boolean => {
      // allow only the modules that live in the same directory
      const uriPathInfo = parsePath(uri);
      if (currentDir === uriPathInfo.dir) {
        let isAlreadyImported = false;
        for (const statement of importStatements ?? []) {
          if (isImportDeclaration(statement)) {
            const name = statement.source.value;
            if (name.match(uriPathInfo.name)?.index) {
              isAlreadyImported = true;
              break;
            }
          }
        }
        return !isAlreadyImported;
      }
      return false;
    };

    return Array.from(Storage_v2.sourceFiles.keys()).reduce<
      ImportCompletionItem[]
    >((acc, uri) => {
      const shortPath = basename(uri);
      if (shouldInclude(uri)) {
        return acc.concat({
          label: "styles",
          type: "module",
          shortPath,
          extras: uri,
          additionalEdits: buildAdditionalEdit(uri),
        });
      }
      return acc;
    }, []);
  }

  public getCssVariablesForCompletion() {
    const module = normalizePath(this.document.uri.fsPath);
    const variables: CssParserResult["variables"] = [];
    if (module.endsWith(".css")) {
      const cssModules = Array.from(Storage_v2.sourceFiles.keys()).filter((c) =>
        c.endsWith(".css")
      );
      for (const m of cssModules) {
        const node = Storage_v2.sourceFiles.get(m);
        if (node) {
          variables.push(...node.variables);
        }
      }
    }
    return variables;
  }
}
