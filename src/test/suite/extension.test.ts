import * as assert from "assert";
import * as path from "path";
import { commands, TextDocument, Uri, window, workspace } from "vscode";
import Storage from "../../storage/Storage";
import "../../extension";
const examplesLocation = "../../../examples/";

const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(""), time);
  });
};
suite("Extension Test Suite", () => {
  window.showInformationMessage("Start all tests.");
  const uri = Uri.file(
    path.join(__dirname, examplesLocation, "react-app/src/App.tsx")
  );
  test("Should parse active Typescript file ", async () => {
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);
    await Storage.bootStrap();
    assert.strictEqual(Storage.getNodes().size, 1);
  });

  test("Should have no identifiers and symbols when the module doesn't have a  refrence to a css modules", async () => {
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);
    await Storage.bootStrap();
    assert.strictEqual(Storage.getNodeByFile()?.identifiers.length, 0);
    assert.strictEqual(Storage.symbols.size, 0);
  });
});
