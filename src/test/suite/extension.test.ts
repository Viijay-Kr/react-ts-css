import * as assert from "assert";
import * as path from "path";
import {
  CompletionTriggerKind,
  Disposable,
  Hover,
  LocationLink,
  Position,
  Uri,
  window,
  workspace,
} from "vscode";
import StorageInstance, {
  experimental_Storage as StorageClass,
} from "../../storage/Storage_v2";

import { DefnitionProvider } from "../../providers/definitions";
import { HoverProvider } from "../../providers/hover";
import {
  ImportCompletionProvider,
  SelectorsCompletionProvider,
} from "../../providers/completion";
import { CompletionList } from "vscode-css-languageservice";
import { writeFileSync } from "fs";
import "../../settings";
const examplesLocation = "../../../examples/";

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

  workspace.getWorkspaceFolder = () => {
    return {
      uri: Uri.file(path.join(__dirname, examplesLocation, "react-app")),
      name: "react-app",
      index: 0,
    };
  };

  suite("Storage Suite", () => {
    test("Should use fake workspace folder", () => {
      assert.equal(
        workspace.getWorkspaceFolder(AppComponentUri)?.name,
        "react-app"
      );
    });
  });

  suite("Provider Factory", async () => {
    suite("definition provider", () => {
      test("should provide definitions when definition command is triggered at a relavent position [Class identifier]", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootStrap();

        const definition = new DefnitionProvider();
        const position = new Position(6, 34);
        const result = await definition.provideDefinition(document, position);

        assert.equal(Array.isArray(result) ? result.length : [], 1);
        StorageInstance.flushStorage();
      });

      test("should not provide definitions if the command is triggered at a irrelavent position [no class identifier]", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootStrap();

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
        await StorageInstance.bootStrap();

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
        await StorageInstance.bootStrap();

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
        await StorageInstance.bootStrap();

        const hover = new HoverProvider();
        const position = new Position(4, 34);
        const result = await hover.provideHover(document, position);
        assert.equal(result, undefined);
        StorageInstance.flushStorage();
      });

      test("should show the correct hover content when hover on suffix selectors", async () => {
        const document = await workspace.openTextDocument(TestComponentUri);
        await window.showTextDocument(document);
        await StorageInstance.bootStrap();

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
        await StorageInstance.bootStrap();

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

        await StorageInstance.bootStrap();

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
        await StorageInstance.bootStrap();

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

        await StorageInstance.bootStrap();
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
        await StorageInstance.bootStrap();
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
        await StorageInstance.bootStrap();
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
        const diagnostics = await StorageInstance.bootStrap();
        assert.equal(diagnostics?.length, 1);
      });

      test("should provide diagnostics for in correct css module import", async () => {
        const document = await workspace.openTextDocument(DiagnosticComponent);
        await window.showTextDocument(document);
        const diagnostics = await StorageInstance.bootStrap();
        assert.equal(diagnostics?.length, 2);
      });
    });
  });
});
