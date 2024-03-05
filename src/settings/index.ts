import { workspace } from "vscode";

export const EXT_NAME = "reactTsScss";

export const getSettings = () => {
  return workspace.getConfiguration(EXT_NAME);
};

export class Settings {
  public get autoComplete(): boolean | undefined {
    return getSettings().get("autoComplete");
  }

  public set autoComplete(v: boolean | undefined) {
    getSettings().update("autoComplete", v);
  }

  public get peekProperties(): boolean | undefined {
    return getSettings().get("peekProperties");
  }

  public set peekProperties(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("peekProperties", v);
  }

  public get definition(): boolean | undefined {
    return getSettings().get("definition");
  }

  public set definition(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("definition", v);
  }

  public get references(): boolean | undefined {
    return getSettings().get("references");
  }

  public set references(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("references", v);
  }

  public get autoImport(): boolean | undefined {
    return getSettings().get("autoImport");
  }

  public set autoImport(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("autoImport", v);
  }

  public get diagnostics(): boolean | undefined {
    return getSettings().get("diagnostics");
  }

  public set diagnostics(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("diagnostics", v);
  }

  public get baseDir(): string | undefined {
    return getSettings().get("baseDir");
  }

  public set baseDir(v: string | undefined) {
    workspace.getConfiguration(EXT_NAME).update("baseDir", v);
  }

  public get cssAutoComplete(): boolean | undefined {
    return getSettings().get("cssAutoComplete");
  }

  public set cssAutoComplete(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("cssAutoComplete", v);
  }

  public get cssDefinitions(): boolean | undefined {
    return getSettings().get("cssDefinitions");
  }

  public set cssDefinitions(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("cssDefinitions", v);
  }

  public get cssSyntaxColor(): boolean | undefined {
    return getSettings().get("cssSyntaxColor");
  }

  public set cssSyntaxColor(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("cssSyntaxColor", v);
  }

  public get tsCleanUpDefs(): boolean | undefined {
    return getSettings().get("tsCleanUpDefs");
  }

  public set tsCleanUpDefs(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("tsCleanUpDefs", v);
  }

  public get cleanUpDefs(): Array<string> | undefined {
    return getSettings().get("cleanUpDefs");
  }

  public set cleanUpDefs(v: Array<string> | undefined) {
    workspace.getConfiguration(EXT_NAME).update("cleanUpDefs", v);
  }

  public get codeLens(): Array<string> | undefined {
    return getSettings().get("codelens");
  }

  public set codeLens(v: Array<string> | undefined) {
    workspace.getConfiguration(EXT_NAME).update("codelens", v);
  }
  public get renameSelector(): Array<string> | undefined {
    return getSettings().get("renameSelector");
  }

  public set renameSelector(v: Array<string> | undefined) {
    workspace.getConfiguration(EXT_NAME).update("renameSelector", v);
  }
}

export default new Settings();
