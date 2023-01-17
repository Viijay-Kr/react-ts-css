import path = require("path");
import * as vscode from "vscode";
import Storage_v2 from "../storage/Storage_v2";
import { DiagnosticCodeActions } from "./diagnostics";

export class DiagnosticCodeAction implements vscode.CodeActionProvider {
  public static readonly codeActionKinds = [vscode.CodeActionKind.QuickFix];
  private static ADD_SELECTOR_COMMAND = "react-ts-css.rename-selector";

  public constructor(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand(
      DiagnosticCodeAction.ADD_SELECTOR_COMMAND,
      this.addSelector
    );
  }
  private async addSelector(...args: any[]) {
    await vscode.window.showTextDocument(args[0].location.uri, {
      selection: args[0].location.range,
    });
  }
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const relaventDiagnostics = (
      context.diagnostics as Array<vscode.Diagnostic & { replace?: string }>
    ).filter(
      (d) =>
        (d.code && d.code === DiagnosticCodeActions.RENAME_SELECTOR) ||
        d.code === DiagnosticCodeActions.CREATE_SELECTOR
    );
    const codeActions: (vscode.CodeAction | vscode.Command)[] = [];
    for (const d of relaventDiagnostics) {
      const actions = this.createCodeActions(d);
      codeActions.push(...actions);
    }
    return codeActions;
  }

  private renameAction(diagnostic: vscode.Diagnostic & { replace?: string }) {
    const renameAction = new vscode.CodeAction(
      "Change spelling to '" + diagnostic.replace + "'",
      vscode.CodeActionKind.QuickFix
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      Storage_v2.activeTextEditor.document.uri,
      diagnostic.range,
      diagnostic.replace ?? ""
    );
    renameAction.edit = edit;
    renameAction.isPreferred = true;
    renameAction.diagnostics = [diagnostic];
    return renameAction;
  }

  private addSelectorAction(
    diagnostic: vscode.Diagnostic & { replace?: string }
  ) {
    if (diagnostic.relatedInformation?.[0]) {
      const codeAction = new vscode.CodeAction(
        `Add '${diagnostic.replace}' to ${path.basename(
          diagnostic.relatedInformation[0].location.uri.path
        )}`,
        vscode.CodeActionKind.QuickFix
      );
      const relatedInformation = diagnostic.relatedInformation ?? [];
      if (relatedInformation.length) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          relatedInformation[0].location.uri,
          relatedInformation[0].location.range,
          `\n.${diagnostic.replace}\t{}`
        );
        codeAction.command = {
          command: DiagnosticCodeAction.ADD_SELECTOR_COMMAND,
          title: "Add Selector ",
          arguments: [
            {
              location: relatedInformation[0].location,
            },
          ],
        };
        codeAction.edit = edit;
        codeAction.isPreferred = true;
        codeAction.diagnostics = [diagnostic];
        return codeAction;
      }
    }
  }

  private createCodeActions(
    diagnostic: vscode.Diagnostic & { replace?: string }
  ): vscode.CodeAction[] {
    switch (diagnostic.code) {
      case DiagnosticCodeActions.RENAME_SELECTOR: {
        const renameAction = this.renameAction(diagnostic);
        const addSelectorAction = this.addSelectorAction(diagnostic);
        const actions = [renameAction];
        if (addSelectorAction) {
          actions.push(addSelectorAction);
        }
        return actions;
      }
      case DiagnosticCodeActions.CREATE_SELECTOR: {
        const addSelectorAction = this.addSelectorAction(diagnostic);
        if (addSelectorAction) {
          return [addSelectorAction];
        }
      }
      default:
        return [];
    }
  }
}
