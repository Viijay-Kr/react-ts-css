// TODO: find meaningful params soon
export interface ProviderParams {
  [key: string]: any;
}

export enum ProviderKind {
  Definition = 1,
  Completion = 2,
  Hover = 3,
  CODE_ACTIONS = 4,
  Colors = 5,
  Invalid = -1,
}
