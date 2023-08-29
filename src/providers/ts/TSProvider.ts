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
import { ParserResult } from "../../parser/v2/ts";
import { Parser } from "../../parser/Parser";
import Settings from "../../settings";
import { parseCss } from "../../parser/v2/css";

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

  public async getMatchedSelector() {
    const parserResult = Store.parser?.parsed_result;
    const accessorAtOffset = Store.parser?.getAccessorAtOffset(
      this.document.offsetAt(this.position)
    );

    if (!accessorAtOffset) {
      return;
    }
    const style_reference = parserResult?.style_references.get(
      accessorAtOffset.object.name
    );
    if (style_reference) {
      const source_css_file = Store.experimental_cssModules.get(
        style_reference?.uri
      );
      if (source_css_file) {
        const css_parser_result = await parseCss(source_css_file);
        if (css_parser_result) {
          if (isIdentifier(accessorAtOffset.property)) {
            const selector = css_parser_result.selectors?.get(
              accessorAtOffset.property.name
            );
            return {
              selector,
              uri: style_reference.uri,
            };
          }
          if (isStringLiteral(accessorAtOffset.property)) {
            const selector = css_parser_result.selectors?.get(
              accessorAtOffset.property.value
            );
            return {
              selector,
              uri: style_reference.uri,
            };
          }
        }
      }
    }
  }

  public getOriginWordRange() {
    const nodeAtOffset = Store.parser?.getAccessorAtOffset(
      this.document.offsetAt(this.position)
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

  public async getSelectorsForCompletion() {
    const document = this.document;
    const currentRange = new Range(
      new Position(this.position.line, this.position.character),
      new Position(this.position.line, this.position.character)
    );
    const parser_result = Store.parser?.parsed_result?.parsedResult;
    let matched_identifier = "";
    if (parser_result) {
      for (const identifier of parser_result.style_identifiers) {
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
          matched_identifier = identifier.name;
          break;
        }
      }
    }
    if (!matched_identifier) {
      return;
    }
    const style_reference =
      Store.parser?.parsed_result?.style_references.get(matched_identifier);
    if (style_reference) {
      const source_css_file = Store.experimental_cssModules.get(
        style_reference.uri
      );
      if (source_css_file) {
        const cssParserResult = await parseCss(source_css_file);
        return cssParserResult?.selectors;
      }
    }
  }

  public async getImportForCompletions() {
    const activeFileuri = this.document.uri.fsPath;
    const activePathInfo = parsePath(activeFileuri);
    const parsedResult = Store.parser?.parsed_result?.parsedResult;
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

    return Array.from(Store.experimental_cssModules.keys()).reduce<
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
