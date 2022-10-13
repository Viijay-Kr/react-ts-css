import {
  CompletionList,
  TextDocument,
  TextEditor,
  Uri,
  window,
  workspace,
} from "vscode";
import { SymbolInformation } from "vscode-css-languageservice";
import { parseActiveFile, ParserResult } from "../parser/tsx";
import { parseCss } from "../parser/css";
import * as fsg from "fast-glob";

type SourceFiles = Map<string, boolean>;
// Full file path of the active opened file
type FileName = string;

type Nodes = Map<FileName, ParserResult>;
type Symbols = Map<FileName, SymbolInformation[]>;

export class Storage {
  protected _sourceFiles: SourceFiles = new Map();
  /** Root path of the workspace */
  protected _workSpaceRoot: string | undefined;
  protected activeTextEditor: TextEditor | undefined = window.activeTextEditor;
  /** Map of parsed nodes by target literal position */
  public nodes: Nodes = new Map();
  public symbols: Symbols = new Map();
  protected completionList: CompletionList = new CompletionList();

  private flushStorage() {
    this.workSpaceRoot = undefined;
    this.activeTextEditor = window.activeTextEditor;
    this._sourceFiles = new Map();
    this.nodes = new Map();
    this.symbols = new Map();
    this.completionList = new CompletionList();
  }

  public get workSpaceRoot(): string | undefined {
    return this._workSpaceRoot;
  }

  public set workSpaceRoot(v: string | undefined) {
    this._workSpaceRoot = v;
  }

  public get sourceFiles(): SourceFiles {
    return this._sourceFiles;
  }
  /**
   * Set the source files on activation
   * @param files string[]
   */
  public setSourcefiles(files: string[]) {
    files.forEach((v) => {
      this._sourceFiles.set(v, true);
    });
  }

  /**
   * Adds one or more files to the map of source files
   * Called every time when a new file is created in the workspace
   * @param files readonly [Uri](#vscode.Uri)[]
   */
  public addSourceFiles(files: readonly Uri[]) {
    files.forEach((f) => {
      if (f.path.endsWith(".css") || f.path.endsWith(".scss")) {
        this._sourceFiles.set(f.path, true);
      }
    });
  }

  /**
   * Setup storage with the nodes of the active File
   */
  public async bootStrap() {
    this.activeTextEditor = window.activeTextEditor;
    if (!this.activeTextEditor) {
      throw new Error("No Active Text Editor found");
    }
    if (this.activeTextEditor.document.isDirty) {
      return;
    }
    const uri = window.activeTextEditor?.document?.uri;
    if (uri) {
      const workspaceRoot = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
      const files = await fsg("**/*.{scss,css}", {
        cwd: workspaceRoot,
        ignore: ["node_modules", "build"],
        absolute: true,
      });
      this.setSourcefiles(files);
      this.workSpaceRoot = workspace.getWorkspaceFolder(uri)?.uri.path;
    }
    const filename = this.activeTextEditor.document.fileName;
    const result = await parseActiveFile(
      this.activeTextEditor.document.getText()
    );
    if (result) {
      this.nodes.set(filename, result);
      result.sourceIdentifiers.forEach(async (r) => {
        const files = Array.from(this.sourceFiles.keys());
        const sourceCssFile = files.find((f) =>
          f.includes(r.import.source.value.split("/").pop()!)
        );
        if (sourceCssFile) {
          this.setCssSymbols(sourceCssFile, parseCss(sourceCssFile));
        }
      });
    }
  }

  /**
   *
   * @param offset number
   * @returns StringLiteral | undefined
   */
  public getNodeAtOffsetPosition(document: TextDocument, offset: number) {
    const node = this.nodes.get(document.fileName);
    if (node) {
      return node.identifiers.find(
        ({ literal: n }) => n.start! <= offset && offset <= n.end!
      );
    }
    return undefined;
  }

  /**
   * Get the active opened text document
   * @returns [TextDocument](#vscode.TextDocument)
   */
  public getActiveTextDocument() {
    if (!this.activeTextEditor) {
      throw new Error("ActiveEditor not found inside storage");
    }
    return this.activeTextEditor.document;
  }

  /**
   * Get a node by filename of the document
   * @returns ParserResult
   */
  public getNodeOfActiveFile() {
    const fileName = this.getActiveTextDocument().fileName;
    return this.nodes.get(fileName);
  }

  /**
   * Get all parsed symbols of a css file
   * @param uri string - File uri of the css file
   * @returns SymbolInformation[]
   */
  public getCSSSymbols(uri: string) {
    return this.symbols.get(uri);
  }

  /**
   *
   * @param uri string - target css file to store as cache key
   * @param symbols - symbols
   */
  public setCssSymbols(uri: string, symbols: SymbolInformation[]) {
    this.symbols.set(uri, symbols);
  }

  /**
   * Caches the list of completions at a given position in the document.
   * This is useful when autocomplete is triggered normally
   * @param list [CompletionList](#vscode.CompletionList)
   */
  public cacheCompletions(list: CompletionList) {
    this.completionList = list;
  }

  /**
   * Returns the cached completion List
   * @returns [CompletionList](#vscode.CompletionList)
   */
  public getCompletionsFromCache() {
    return this.completionList;
  }

  /**
   * Flushes the entire storage on deactivation or opening a new workspace
   */
  public clear() {
    this.flushStorage();
  }

  public getNodes() {
    return this.nodes;
  }

  public getNodeByFileUri(uri: string) {
    return this.nodes.get(uri);
  }
}

export default new Storage();
