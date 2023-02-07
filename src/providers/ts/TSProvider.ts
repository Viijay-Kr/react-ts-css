import {
  MarkdownString,
  Position,
  Range,
  TextDocument,
  TextEdit,
} from "vscode";
import Store from "../../store/Store";
import {
  isIdentifier,
  isImportDeclaration,
  isStringLiteral,
} from "@babel/types";
import { basename, parse as parsePath, relative } from "path";
import { normalizePath } from "../../path-utils";
import { ProviderKind } from "../types";

export interface CompletionItemType {
  label: string;
  content?: MarkdownString;
  extras?: string;
  additionalEdits?: TextEdit[];
}

export interface ImportCompletionItem extends CompletionItemType {
  type?: "module";
  shortPath: string;
}
export class TSProvider {
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
      this.document = Store.getActiveTextDocument();
    }
  }

  public getMatchedSelector() {
    const accessorAtOffset = Store.getAccessorAtOffset(
      this.document,
      this.document.offsetAt(this.position)
    );
    if (!accessorAtOffset) {
      return;
    }
    const style_reference = Store.getStyleReferenceByIdentifier(
      accessorAtOffset.object.name
    );
    if (style_reference) {
      const selectors = Store.cssModules.get(style_reference?.uri)?.selectors;
      if (isIdentifier(accessorAtOffset.property)) {
        const selector = selectors?.get(accessorAtOffset.property.name);
        return {
          selector,
          uri: style_reference.uri,
        };
      }
      if (isStringLiteral(accessorAtOffset.property)) {
        const selector = selectors?.get(accessorAtOffset.property.value);
        return {
          selector,
          uri: style_reference.uri,
        };
      }
    }
  }

  public getOriginWordRange() {
    const document = this.document;
    const nodeAtOffset = Store.getAccessorAtOffset(
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

  public getSelectorsForCompletion() {
    const document = this.document;
    const currentRange = new Range(
      new Position(this.position.line, this.position.character),
      new Position(this.position.line, this.position.character)
    );
    const tsModule = Store.getActiveTsModule();
    let natched_identifier = "";
    if (tsModule) {
      for (const identifier of tsModule.style_identifiers) {
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
    const style_reference =
      Store.getStyleReferenceByIdentifier(natched_identifier);
    if (style_reference) {
      return Store.cssModules.get(style_reference.uri)?.selectors;
    }
  }

  public async getImportForCompletions() {
    const activeFileuri = this.document.uri.fsPath;
    const activePathInfo = parsePath(activeFileuri);
    const parsedResult = Store.getActiveTsModule();
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

    return Array.from(Store.cssModules.keys()).reduce<ImportCompletionItem[]>(
      (acc, uri) => {
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
      },
      []
    );
  }

  public getOriginWordAtRange() {
    const offset = this.document.offsetAt(this.position);
    let i = offset - 1;
    const text = this.document.getText();
    while (i >= 0 && ' \t\n\r":{[()]},*>+'.indexOf(text.charAt(i)) === -1) {
      i--;
    }
    return text.substring(i + 1, offset);
  }
}
