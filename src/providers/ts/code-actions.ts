import path = require("path");
import * as vscode from "vscode";
import Store from "../../store/Store";
import {
  DiagnosticCodeActions,
  DiagnosticNonCodeActions,
  extended_Diagnostic,
} from "../diagnostics";

export class DiagnosticCodeAction implements vscode.CodeActionProvider {
  public static readonly codeActionKinds = [vscode.CodeActionKind.QuickFix];
  private static ADD_SELECTOR_COMMAND = "react-ts-css.rename-selector";

  public constructor(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand(
      DiagnosticCodeAction.ADD_SELECTOR_COMMAND,
      this.addSelectorCommand
    );
    vscode.commands.registerCommand(
      DiagnosticNonCodeActions.IGNORE_WARNING,
      this.ignoreWarningCommand
    );
  }
  private async addSelectorCommand(...args: any[]) {
    await vscode.window.showTextDocument(args[0].location.uri, {
      selection: args[0].location.range,
    });
  }

  // TODO: type args
  private async ignoreWarningCommand(...args: [vscode.Range, string]) {
    Store.collectIgnoredDiagnostics([args[0], args[1]]);
  }

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const relaventDiagnostics = (
      context.diagnostics as Array<extended_Diagnostic>
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

  private renameAction(diagnostic: extended_Diagnostic) {
    const renameAction = new vscode.CodeAction(
      "Change spelling to '" + diagnostic.replace + "'",
      vscode.CodeActionKind.QuickFix
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      Store.activeTextEditor.document.uri,
      diagnostic.range,
      diagnostic.replace ?? ""
    );
    renameAction.edit = edit;
    renameAction.isPreferred = true;
    renameAction.diagnostics = [diagnostic];
    return renameAction;
  }

  private addSelectorAction(diagnostic: extended_Diagnostic) {
    if (diagnostic.relatedInformation?.[0]) {
      const codeAction = new vscode.CodeAction(
        `Add '${diagnostic.replace}' to ${path.basename(
          diagnostic.relatedInformation[0].location.uri.fsPath
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

  private ignoreWarningAction(diagnostic: extended_Diagnostic) {
    try {
      const action = new vscode.CodeAction(
        `ignore '${diagnostic.sourceAtRange}' warning`,
        vscode.CodeActionKind.QuickFix
      );
      action.command = {
        command: DiagnosticNonCodeActions.IGNORE_WARNING,
        title: "Ignore warnings",
        arguments: [diagnostic.range, diagnostic.sourceAtRange],
      };
      action.isPreferred = true;
      action.diagnostics = [diagnostic];
      return action;
    } catch (e) {
      Store.outputChannel.error(
        e as Error,
        `CodeActionError: Ingore warning failed`
      );
      throw e;
    }
  }

  private createCodeActions(
    diagnostic: extended_Diagnostic
  ): vscode.CodeAction[] {
    let actions: vscode.CodeAction[] = [];
    switch (diagnostic.code) {
      case DiagnosticCodeActions.RENAME_SELECTOR: {
        const ignoreWarningAction = this.ignoreWarningAction(diagnostic);
        const renameAction = this.renameAction(diagnostic);
        const addSelectorAction = this.addSelectorAction(diagnostic);
        actions.push(renameAction);
        if (addSelectorAction) {
          actions.push(addSelectorAction, ignoreWarningAction);
        }
        break;
      }
      case DiagnosticCodeActions.CREATE_SELECTOR: {
        const addSelectorAction = this.addSelectorAction(diagnostic);
        const ignoreWarningAction = this.ignoreWarningAction(diagnostic);
        if (addSelectorAction) {
          actions.push(addSelectorAction, ignoreWarningAction);
        }
        break;
      }
      default:
        return actions;
    }
    return actions;
  }
}
