import * as assert from "assert";
import * as path from "path";
import {
  CancellationToken,
  CompletionTriggerKind,
  Disposable,
  Hover,
  LocationLink,
  Position,
  Uri,
  window,
  workspace,
} from "vscode";
import StorageInstance, { Store } from "../../store/Store";

import { DefnitionProvider } from "../../providers/ts/definitions";
import { HoverProvider } from "../../providers/ts/hover";
import {
  ImportCompletionProvider,
  SelectorsCompletionProvider,
} from "../../providers/ts/completion";
import { CompletionList } from "vscode-css-languageservice";
import { writeFileSync } from "fs";
import { CssVariablesCompletion } from "../../providers/css/completion";
import { CssDefinitionProvider } from "../../providers/css/definition";
import { CssDocumentColorProvider } from "../../providers/css/colors";
import { normalizePath } from "../../path-utils";
import { ReferenceProvider } from "../../providers/css/references";
import {
  ReferenceCodeLens,
  ReferenceCodeLensProvider,
} from "../../providers/css/codelens";
import Settings from "../../settings";
const examplesLocation = "../../../examples/";

function setWorskpaceFolder(app: string) {
  workspace.getWorkspaceFolder = () => {
    return {
      uri: Uri.file(path.join(__dirname, examplesLocation, app)),
      name: app,
      index: 0,
    };
  };

  workspace.getConfiguration = () => ({
    get: (v) => "true",
    // @ts-ignore
    update: () => {},
  });
}

setWorskpaceFolder("react-app");
suite("Extension Test Suite", async () => {
  window.showInformationMessage("Start all tests.");
  const AppComponentUri = Uri.file(
    path.join(__dirname, examplesLocation, "react-app/src/App.tsx")
  );
  const TestComponentUri = Uri.file(
    path.join(
      __dirname,
      examplesLocation,
      "react-app/src/test/TestComponent.tsx"
    )
  );

  const AutoImportComponent = Uri.file(
    path.join(
      __dirname,
      examplesLocation,
      "react-app/src/test/auto-import/AutoImport.tsx"
    )
  );

  const AutoImportComponent1 = Uri.file(
    path.join(
      __dirname,
      examplesLocation,
      "react-app/src/test/auto-import/AutoImport_1.tsx"
    )
  );

  const TestCssModulePath = path.join(
    __dirname,
    examplesLocation,
    "react-app/src/test/styles/TestStyles.module.scss"
  );

  const DiagnosticComponent = Uri.file(
    path.join(
      __dirname,
      examplesLocation,
      "react-app/src/test/Diagnostics/Diagnostics.tsx"
    )
  );

  suite("Storage Suite", () => {
    test("Should use fake workspace folder", () => {
      assert.equal(
        workspace.getWorkspaceFolder(AppComponentUri)?.name,
        "react-app"
      );
    });
  });

  suite("TSX/TS module features", async () => {
    suite("definition provider", () => {
      test("should provide definitions when definition command is triggered at a relavent position [Class identifier]", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();

        const definition = new DefnitionProvider();
        const position = new Position(6, 34);
        const result = await definition.provideDefinition(document, position);

        assert.equal(Array.isArray(result) ? result.length : [], 1);
        StorageInstance.flushStorage();
      });

      test("should not provide definitions if the command is triggered at a irrelavent position [no class identifier]", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();

        const definition = new DefnitionProvider();
        const position = new Position(4, 34);
        const result = await definition.provideDefinition(document, position);
        if (Array.isArray(result)) {
          assert.equal(result.length, 0);
        }
        StorageInstance.flushStorage();
      });

      test("should go to the correct definition content when definition is triggered on suffixed/nested selectors", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();

        const definition = new DefnitionProvider();
        const suffixResult = (await definition.provideDefinition(
          document,
          new Position(7, 37)
        )) as LocationLink[];
        assert.equal(suffixResult[0].targetRange.start.line + 1, 12);

        const nestedChild = (await definition.provideDefinition(
          document,
          new Position(10, 39)
        )) as LocationLink[];

        assert.equal(nestedChild[0].targetRange.start.line + 1, 4);

        const sibling = (await definition.provideDefinition(
          document,
          new Position(11, 41)
        )) as LocationLink[];
        assert.equal(sibling[0].targetRange.start.line + 1, 8);
      });
    });

    suite("hover Provider", () => {
      test("should create a hovering content on hover at relavent position [Class selctor idenftier]", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();

        const hover = new HoverProvider();
        const position = new Position(6, 34);
        const result = await hover.provideHover(document, position);
        assert.notEqual(result, undefined);
        assert.equal(
          // @ts-ignore
          result?.contents[1]?.includes("test-container"),
          true
        );
        StorageInstance.flushStorage();
      });

      test("should not create a hovering content on hover at irrelavent position [Class selctor idenftier]", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();

        const hover = new HoverProvider();
        const position = new Position(4, 34);
        const result = await hover.provideHover(document, position);
        assert.equal(result, undefined);
        StorageInstance.flushStorage();
      });

      test("should show the correct hover content when hover on suffix selectors", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();

        const definition = new HoverProvider();
        const result = (await definition.provideHover(
          document,
          new Position(7, 37)
        )) as Hover;
        // @ts-ignore
        assert.equal(result.contents[1].includes("&-test-suffix"), true);
      });

      test("should work for camel case selector values", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();

        const definition = new HoverProvider();
        const result = (await definition.provideHover(
          document,
          new Position(14, 37)
        )) as Hover;
        // @ts-ignore
        assert.equal(result.contents[1].includes("testCamelCase"), true);
      });
    });

    suite("completion Provider", () => {
      test("should provide correct number of completions when triggered at the relavent position", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);

        await StorageInstance.bootstrap();

        const completion = new SelectorsCompletionProvider();
        const position = new Position(6, 31);
        const list = (await completion.provideCompletionItems(
          document,
          position,
          {
            isCancellationRequested: false,
            onCancellationRequested: () => new Disposable(() => {}),
          },
          {
            triggerCharacter: ".",
            triggerKind: CompletionTriggerKind.TriggerCharacter,
          }
        )) as CompletionList;
        assert.equal(
          list.items.some((i) => i.label === "test-container"),
          true
        );
        StorageInstance.flushStorage();
      });

      test("should not consider pusedo selectors for completion", async () => {
        const cssDocument = await workspace.openTextDocument(TestCssModulePath);
        const replaceText = `.test-container:hover { position:relative;}`;
        let contents = cssDocument.getText() + replaceText;
        const enc = new TextEncoder();
        writeFileSync(cssDocument.uri.fsPath, enc.encode(contents));

        const document = await workspace.openTextDocument(TestComponentUri);
        await StorageInstance.bootstrap();

        const completion = new SelectorsCompletionProvider();
        const position = new Position(6, 31);
        const list = (await completion.provideCompletionItems(
          document,
          position,
          {
            isCancellationRequested: false,
            onCancellationRequested: () => new Disposable(() => {}),
          },
          {
            triggerCharacter: ".",
            triggerKind: CompletionTriggerKind.TriggerCharacter,
          }
        )) as CompletionList;
        contents = contents.replace(replaceText, "");
        writeFileSync(cssDocument.uri.fsPath, enc.encode(contents));
        assert.equal(
          list.items.some((i) => i.label === "test-container:hover"),
          false
        );

        StorageInstance.flushStorage();
      });

      test("should consider newly added selectors for completion", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);

        const cssDocument = await workspace.openTextDocument(TestCssModulePath);
        const replaceText = `.test-hover { position:relative; }`;
        let contents = cssDocument.getText() + replaceText;
        const enc = new TextEncoder();
        writeFileSync(cssDocument.uri.fsPath, enc.encode(contents));

        await StorageInstance.bootstrap();
        const completion = new SelectorsCompletionProvider();
        writeFileSync(cssDocument.uri.fsPath, enc.encode(contents));
        const position = new Position(6, 31);
        const list = (await completion.provideCompletionItems(
          document,
          position,
          {
            isCancellationRequested: false,
            onCancellationRequested: () => new Disposable(() => {}),
          },
          {
            triggerCharacter: ".",
            triggerKind: CompletionTriggerKind.TriggerCharacter,
          }
        )) as CompletionList;
        contents = contents.replace(replaceText, "");
        writeFileSync(cssDocument.uri.fsPath, enc.encode(contents));
        assert.equal(list.items.length, 6);
        StorageInstance.flushStorage();
      });

      test("should provide import completions on accessing styles identifier", async () => {
        const document = await workspace.openTextDocument(AutoImportComponent);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const completion = new ImportCompletionProvider();
        const position = new Position(6, 31);
        const list = await completion.provideCompletionItems(
          document,
          position
        );
        assert.equal(list?.items.length, 3);
        StorageInstance.flushStorage();
      });

      test("should not provide import completions of already imported module on accessing styles identifier", async () => {
        const document = await workspace.openTextDocument(AutoImportComponent1);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const completion = new ImportCompletionProvider();
        const position = new Position(6, 31);
        const list = await completion.provideCompletionItems(
          document,
          position
        );
        assert.equal(list?.items.length, 2);
        StorageInstance.flushStorage();
      });
    });

    suite("diagnostics provider", () => {
      test("should provide diagnostics for missing selector", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        const diagnostics = await StorageInstance.bootstrap();
        assert.equal(diagnostics?.length, 1);
      });

      test("should provide diagnostics for in correct css module import", async () => {
        const document = await workspace.openTextDocument(DiagnosticComponent);
        await window.showTextDocument(document);
        const diagnostics = await StorageInstance.bootstrap();
        assert.equal(diagnostics?.length, 2);
      });

      test("should not provide dignostics for dynamic slectors", async () => {
        const DynamicClasses = Uri.file(
          path.join(
            __dirname,
            examplesLocation,
            "react-app/src/test/DynamicClasses/DynamicClasses.tsx"
          )
        );
        const document = await workspace.openTextDocument(DynamicClasses);
        await window.showTextDocument(document);
        const diagnostics = await StorageInstance.bootstrap();
        assert.equal(diagnostics?.length, 0);
      });
    });
  });

  suite("Selector Possibilities", () => {
    const SelectorCssModule = path.join(
      __dirname,
      examplesLocation,
      "react-app/src/test/VariousSelectors/VariousSelectors.module.scss"
    );
    test("should include normal selectors [no relationship or bound to any rules]", async () => {
      const document = await workspace.openTextDocument(SelectorCssModule);
      await window.showTextDocument(document);
      await StorageInstance.bootstrap();
      const source_css_file = StorageInstance.cssModules.get(
        normalizePath(SelectorCssModule)
      );
      const node = source_css_file;
      assert.notEqual(node, undefined);
      const selectors = node!.selectors;
      assert.equal(
        selectors.get("normal-selector")?.selector,
        "normal-selector"
      );
      assert.equal(
        selectors.get("sibling-selector")?.selector,
        "sibling-selector"
      );
    });
    test("should include  selectors from mixins and media queries", async () => {
      const document = await workspace.openTextDocument(SelectorCssModule);
      await window.showTextDocument(document);
      await StorageInstance.bootstrap();
      const source_css_file = StorageInstance.cssModules.get(
        normalizePath(SelectorCssModule)
      );
      const node = source_css_file;
      assert.notEqual(node, undefined);
      const selectors = node!.selectors;
      assert.equal(selectors.get("flex-row")?.selector, "flex-row");
      assert.equal(selectors.get("desktop")?.selector, "desktop");
      assert.equal(selectors.get("thirteen")?.selector, "thirteen");
      assert.equal(selectors.get("card")?.selector, "card");
    });

    test("should include selectors from placeholders", async () => {
      const document = await workspace.openTextDocument(SelectorCssModule);
      await window.showTextDocument(document);
      await StorageInstance.bootstrap();
      const source_css_file = StorageInstance.cssModules.get(
        normalizePath(SelectorCssModule)
      );
      const node = source_css_file;
      assert.notEqual(node, undefined);
      const selectors = node!.selectors;
      assert.equal(selectors.get("place-holder")?.selector, "place-holder");
    });

    test("should include suffixed selectors at any depth", async () => {
      const document = await workspace.openTextDocument(SelectorCssModule);
      await window.showTextDocument(document);
      await StorageInstance.bootstrap();
      const source_css_file = StorageInstance.cssModules.get(
        normalizePath(SelectorCssModule)
      );
      const node = source_css_file;
      assert.notEqual(node, undefined);
      const selectors = node!.selectors;
      assert.equal(
        selectors.get("normal-selector-suffix")?.selector,
        "normal-selector-suffix"
      );
      assert.equal(
        selectors.get("normal-selector-suffix-nested-suffix")?.selector,
        "normal-selector-suffix-nested-suffix"
      );
      assert.equal(
        selectors.get("flex-row-center")?.selector,
        "flex-row-center"
      );
    });

    test("should include camelCased suffixed selectors", async () => {
      const document = await workspace.openTextDocument(SelectorCssModule);
      await window.showTextDocument(document);
      await StorageInstance.bootstrap();
      const source_css_file = StorageInstance.cssModules.get(
        normalizePath(SelectorCssModule)
      );
      const node = source_css_file;
      assert.notEqual(node, undefined);
      const selectors = node!.selectors;
      assert.equal(selectors.get("camelCase")?.selector, "camelCase");
      assert.equal(
        selectors.get("camelCasesuffix")?.selector,
        "camelCasesuffix"
      );
      assert.equal(
        selectors.get("camelCasesuffixonemore")?.selector,
        "camelCasesuffixonemore"
      );
    });
  });

  suite("Css language features", async () => {
    const AppCssUri = path.join(
      __dirname,
      examplesLocation,
      "react-app/src/App.css"
    );
    const IndexCssUri = path.join(
      __dirname,
      examplesLocation,
      "react-app/src/index.css"
    );
    suite("Completions", () => {
      test("provide completions for css variables across files", async () => {
        const document = await workspace.openTextDocument(AppCssUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new CssVariablesCompletion();
        const position = new Position(6, 31);
        const result = await provider.provideCompletionItems(
          document,
          position
        );
        assert.equal((result?.items.length ?? 0) > 1, true);
      });
      test("completion items should resolve item to `var(${name})` if no `var` key word exists", async () => {
        const document = await workspace.openTextDocument(AppCssUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new CssVariablesCompletion();
        const position = new Position(6, 31);
        const result = await provider.provideCompletionItems(
          document,
          position
        );
        assert.equal(
          result?.items[0].insertText?.toString().includes("var"),
          true
        );
      });

      test("completions items should not resolve to `var${name}` when var keyword exists", async () => {
        const document = await workspace.openTextDocument(AppCssUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new CssVariablesCompletion();
        const position = new Position(46, 14);
        const result = await provider.provideCompletionItems(
          document,
          position
        );
        assert.equal(
          result?.items[0].insertText?.toString().includes("var"),
          false
        );
      });
      test("dont provide completions for css variables from same file", async () => {
        const document = await workspace.openTextDocument(IndexCssUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new CssVariablesCompletion();
        const position = new Position(6, 31);
        const result = await provider.provideCompletionItems(
          document,
          position
        );
        assert.equal(result?.items.length, 0);
      });
    });
    suite("Definitions", () => {
      test("provide definitions for variables across different files", async () => {
        const document = await workspace.openTextDocument(AppCssUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new CssDefinitionProvider();
        const position = new Position(40, 21);
        const result = await provider.provideDefinition(document, position);
        assert.equal(result.length > 0, true);
      });

      test("dont provide definitions for variables within the same file", async () => {
        const document = await workspace.openTextDocument(IndexCssUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new CssDefinitionProvider();
        const position = new Position(23, 20);
        const result = await provider.provideDefinition(document, position);
        assert.equal(result.length === 0, true);
      });
    });
    suite("Colors", () => {
      test("provide color information for variables across different files", async () => {
        const document = await workspace.openTextDocument(AppCssUri);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new CssDocumentColorProvider();
        const result = await provider.provideDocumentColors(document);
        assert.equal(result.length > 0, true);
      });
    });

    suite("References", () => {
      Settings.references = true;
      test("provide references for a selector at a given position", async () => {
        const document = await workspace.openTextDocument(TestCssModulePath);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new ReferenceProvider();
        const result = await provider.provideReferences(
          document,
          new Position(3, 11)
        );
        assert.equal((result ?? []).length, 1);
      });
      test("provide references for a suffix selector at a given position from multiple modules", async () => {
        const document = await workspace.openTextDocument(TestCssModulePath);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new ReferenceProvider();
        const result = await provider.provideReferences(
          document,
          new Position(11, 11)
        );
        assert.equal(result?.length, 4);
      });
    });

    suite("Code Lens", () => {
      Settings.codeLens = true;
      test("provide reference code lens for a selectors in a document", async () => {
        const document = await workspace.openTextDocument(TestCssModulePath);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new ReferenceCodeLensProvider();
        const result = await provider.provideCodeLenses(document, {
          isCancellationRequested: false,
        } as CancellationToken);
        assert.equal((result ?? []).length > 0, true);
      });
      test("provide references for a suffix selector in a document", async () => {
        const document = await workspace.openTextDocument(TestCssModulePath);
        await window.showTextDocument(document);
        await StorageInstance.bootstrap();
        const provider = new ReferenceCodeLensProvider();
        const lenses = await provider.provideCodeLenses(document, {
          isCancellationRequested: false,
        } as CancellationToken);
        const result = await provider.resolveCodeLens(
          new ReferenceCodeLens(document, document.fileName, lenses[3].range)
        );
        assert.equal(result.command?.command, "editor.action.showReferences");
      });
    });
  });
});

suite("TS Config path aliases", async () => {
  suite.skip(
    "should work in a mono repo setup with tsconfig aliases",
    async () => {
      StorageInstance.flushStorage();
      const IndexComponent = Uri.file(
        path.join(
          __dirname,
          examplesLocation,
          "monorepo/apps/web/pages/index.tsx"
        )
      );

      test("should not report an import diagnostics error on aliased module imports", async () => {
        StorageInstance.workSpaceRoot = path.join(
          __dirname,
          examplesLocation,
          "monorepo"
        );
        const document = await workspace.openTextDocument(IndexComponent);
        await window.showTextDocument(document);
        const diagnostics = await StorageInstance.bootstrap();
        assert.equal(diagnostics?.length, 0);
        StorageInstance.flushStorage();
      });

      test("should resolve selectors from aliased module imports reference for definition", async () => {
        StorageInstance.workSpaceRoot = path.join(
          __dirname,
          examplesLocation,
          "monorepo"
        );
        const document = await workspace.openTextDocument(IndexComponent);
        await window.showTextDocument(document);

        await StorageInstance.bootstrap();
        const definition = new DefnitionProvider();
        const position = new Position(6, 32);
        const result = await definition.provideDefinition(document, position);

        assert.equal(Array.isArray(result) ? result.length : [], 1);
        StorageInstance.flushStorage();
      });

      test("should resolve selectors from aliased module imports reference for hover", async () => {
        StorageInstance.workSpaceRoot = path.join(
          __dirname,
          examplesLocation,
          "monorepo"
        );
        const document = await workspace.openTextDocument(IndexComponent);
        await window.showTextDocument(document);

        await StorageInstance.bootstrap();
        const hover = new HoverProvider();
        const position = new Position(6, 33);
        const result = await hover.provideHover(document, position);

        assert.notEqual(result, undefined);
        StorageInstance.flushStorage();
      });
    }
  );

  suite(
    "should work in a poly repo setup with a single root tsconfig file",
    async () => {
      StorageInstance.flushStorage();
      setWorskpaceFolder("react-app");
      const AppComponent = Uri.file(
        path.join(__dirname, examplesLocation, "react-app/src/App.tsx")
      );

      test("should not report an import diagnostics error on aliased module imports", async () => {
        const document = await workspace.openTextDocument(AppComponent);
        await window.showTextDocument(document);
        const diagnostics = await StorageInstance.bootstrap();
        assert.equal(diagnostics?.length, 0);
        StorageInstance.flushStorage();
      });

      test("should resolve selectors from aliased module imports reference for definition", async () => {
        const document = await workspace.openTextDocument(AppComponent);
        await window.showTextDocument(document);

        await StorageInstance.bootstrap();
        const definition = new DefnitionProvider();
        const position = new Position(17, 48);
        const result = await definition.provideDefinition(document, position);

        assert.equal(Array.isArray(result) ? result.length : [], 1);
        StorageInstance.flushStorage();
      });

      test("should resolve selectors from aliased module imports reference for hover", async () => {
        const document = await workspace.openTextDocument(AppComponent);
        await window.showTextDocument(document);

        await StorageInstance.bootstrap();
        const hover = new HoverProvider();
        const position = new Position(17, 48);
        const result = await hover.provideHover(document, position);

        assert.notEqual(result, undefined);
        StorageInstance.flushStorage();
      });
    }
  );
});
