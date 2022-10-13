# React TS CSS

VS Code extenstion that enables CSS modules support for your React projects written in typescript.
Currently supports CSS and SCSS modules with the following capabilities

- [Definitions](https://code.visualstudio.com/api/references/vscode-api#DefinitionProvider)

  - Go to selector
  - Go to nested child selector
  - Go to suffixed selector.

  <img src='./assets/definitions.gif' height="300"  alt="hover" />

- [Hover](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

  - Peek properties of the hovered selector

    <img src='./assets/hover.gif' height="300"  alt="hover" />

- [Completions](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)
  - Auto completion of selectors

## Settings

Defaults

```json
{
  "reactTsCSS.peek": true,
  "reactTsCSS.autoComplete": true,
  "reactTsCSS.definition": true
}
```
