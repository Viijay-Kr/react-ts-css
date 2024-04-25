// TODO: find meaningful params soon
export interface ProviderParams {
  [key: string]: any;
}

export enum ProviderKind {
  Definition,
  Completion,
  Hover,
  CODE_ACTIONS,
  Colors,
  References,
  RenameSelector,
  CodeLens,
  Invalid,
  Diagnostic,
}
