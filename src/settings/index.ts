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

  public get tsconfig(): string | undefined {
    return getSettings().get("tsconfig");
  }

  public set tsconfig(v: string | undefined) {
    workspace.getConfiguration(EXT_NAME).update("tsconfig", v);
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

  public get typecriptCleanUpDefs(): boolean | undefined {
    return getSettings().get("typecriptCleanUpDefs");
  }

  public set typecriptCleanUpDefs(v: boolean | undefined) {
    workspace.getConfiguration(EXT_NAME).update("typecriptCleanUpDefs", v);
  }

  public get cleanUpDefs(): Array<string> | undefined {
    return getSettings().get("cleanUpDefs");
  }

  public set cleanUpDefs(v: Array<string> | undefined) {
    workspace.getConfiguration(EXT_NAME).update("cleanUpDefs", v);
  }
}

export default new Settings();
