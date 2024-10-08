<h1>React CSS modules</h1>

![build](images/build.png)
![tests](images/tests.png)
![license](images/license.png)
![version](images/version.png)

VS Code extension that enables CSS modules IntelliSense for your React projects written in TypeScript/JavaScript.
Currently supports CSS, SCSS, Less modules

This extension also supports CSS language features which are not supported by built-in VS Code [code CSS language features](https://github.com/microsoft/vscode-css-languageservice). Check [CSS language features](#cssscssless-language-features) for more info

## Capabilities

> This extension is unique in terms of support for major types of [Casings](#casings) and different types of CSS class selectors
>
> Different types of selectors are supported
>
> - Root selectors
> - Nested selectors
> - Suffixed selectors ([SCSS only](https://sass-lang.com/documentation/style-rules/parent-selector#adding-suffixes))
> - Deeply nested suffix selectors
> - Pseudo Classes
> - Pseudo Class functions
>
> Almost all project scaffolders such as Vite, Next.js and CRA add css module declaration to the project by injecting it in a `.d.ts` file (for instance inside `node_modules/vite/client.d.ts` added by Vite). TypeScript treats these definitions as definition provider for Style properties. This results in a useless definition result when VS Code `Go to Definition` is triggered. Check this [issue](https://github.com/Viijay-Kr/react-ts-css/issues/68).
>
> This extension gives you an option to eliminate the useless results by using the TypeScript plugin [typescript-cleanup-defs](https://www.npmjs.com/package/typescript-cleanup-definitions) that can filter out those definitions results. Check the plugin for more details.
>
> Override this plugin using the setting `reactTsScss.tsCleanUpDefs`

See how it compares with **CSS modules**

| Features                  |                                                 React CSS Modules                                                 |                                                    CSS modules                                                    |
| ------------------------- | :---------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------: |
| Definition                | Camel Case selectors - ✅<br>Snake Case selectors - ✅<br>Pascal Case selectors - ✅<br>Kebab Case selectors - ✅ | Camel Case selectors - ✅<br>Snake Case selectors - ❌<br>Pascal Case selectors - ❌<br>Kebab Case selectors - ❌ |
| Completion                | Camel Case selectors - ✅<br>Snake Case selectors - ✅<br>Pascal Case selectors - ✅<br>Kebab Case selectors - ✅ | Camel Case selector - ✅<br>Snake Case selectors - ✅<br>Pascal Case selectors - ✅<br>Kebab Case selectors - ✅  |
| Hover                     |                                     Supported for all types of selectors - ✅                                     |                                                        ❌                                                         |
| SCSS Suffix Selectors     |                                                        ✅                                                         |                                                        ❌                                                         |
| Psuedo Classes            |                                                        ✅                                                         |                                                        ✅                                                         |
| Psuedo Class Functions    |                                                        ✅                                                         |                                                        ✅                                                         |
| Less suffix selectors     |                                                        ✅                                                         |                                                        ❌                                                         |
| Selector Diagnostics      |                                                        ✅                                                         |                                                        ❌                                                         |
| Selector References       |                                                        ✅                                                         |                                                        ❌                                                         |
| Code lenses               |                                                        ✅                                                         |                                                        ❌                                                         |
| Rename selector           |                                                        ✅                                                         |                                                        ❌                                                         |
| Mixin Selector            |                                                        ✅                                                         |                                                        ❌                                                         |
| Mixin Reference selectors |                                                        ✅                                                         |                                                        ❌                                                         |
| Code actions              |                                                        ✅                                                         |                                                        ❌                                                         |
| CSS Definitions           |                                                        ✅                                                         |                                                        ❌                                                         |
| CSS Variables Completions |                                                        ✅                                                         |                                                        ❌                                                         |
| CSS Color Presentation    |                                                        ✅                                                         |                                                        ❌                                                         |

## Langauge Features

- [TS/TSX|JS/JSX Language Features](#tstsxjsjsx-language-features)
  - [Definitions](#definitions)
  - [Hover](#hover)
  - [Completions](#completions)
  - [Diagnostics](#diagnostics)
  - [Code Actions](#code-actions)
- [CSS/SCSS/Less Language Features](#cssscssless-language-features)
  - [Rename Provider](#rename-provider)
  - [Reference Provider](#reference-provider)
  - [Code Lens (**Default OFF**)](#code-lens)
  - [Variable Completion - **\[Only CSS\]**](#variable-completion---only-css)
  - [Variable Definitions - **\[Only CSS\]**](#variable-definitions---only-css)
  - [Syntax Colors and Presentation - **\[Only CSS\]**](#syntax-colors-and-presentation---only-css)
- [Casings](#casings)
- [Settings](#settings)
- [Roadmap](#roadmap)
- [Contribution](#contribution)

## TS/TSX|JS/JSX Language Features

### [Definitions](https://code.visualstudio.com/api/references/vscode-api#DefinitionProvider)

- Go to any type of selector definition from your React components - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/definitions.gif)
  - `reactTsScss.definition` - setting for this feature

### [Hover](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

- Peek CSS properties of a selector on hover - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/hover.gif)
  - `reactTsScss.peekProperties` - setting for this feature

### [Completions](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

- Completion of selectors - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/autocomplete.gif)
- Completion of style identifiers with automatic import of closest (S)CSS module - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/auto-import.gif)
  - `reactTsScss.autoComplete` - setting for this feature

### [Diagnostics](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic)

- Useful diagnostics information are provided for missing selector - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/missing-selector.png)
- Module not found error is also provided for non existing CSS modules - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/missing-module.png)
- Hints for un used selectors inside CSS/SCSS documents - [demo](/assets/css-diagnostics.gif)
- Settings to change diagnostics
  - `reactTsScss.diagnostics` - Toggle to turn off diagnostics
  - `reactTsScss.tsconfig` - Base TS Config path in the project. Useful for resolving path aliases. Defaults to './tsconfig.json'
  - `reactTsScss.baseDir` - Root directory of your project. Useful if tsconfig doesn't have information about path aliases. Defaults to 'src'

### [Code Actions](https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings)

- Code Action to quick fix misspelled selectors
- Code Action to add a non existing selector to the corresponding CSS/SCSS module
- Code Action to ignore warnings temporarily
- [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/code-actions.gif)
  - `reactTsScss.diagnostics` - setting for this feature

## CSS/SCSS/Less Language Features

### [Rename Provider](https://code.visualstudio.com/api/language-extensions/programmatic-language-features#rename-symbols)

- Rename all the references of a selector across various component files - [Demo](assets/rename-selector.gif)
- Currently rename only work for the modules that are imported in tsx/jsx files

  - `reactTsScss.renameSelector` - setting for this feature

### [Reference Provider](https://code.visualstudio.com/docs/languages/typescript#_code-navigation)

- Find all the references of a selector across various component files - [Demo](assets/references.gif)
- Currently references only work for the modules that are imported in tsx/jsx files

  - `reactTsScss.references` - setting for this feature

### [Code Lens](https://code.visualstudio.com/api/language-extensions/programmatic-language-features#codelens-show-actionable-context-information-within-source-code)

- Useful Code Lens context for selectors based on their references across component files - [Demo](assets/code-lens.gif)
- A quick alternative to [reactTsScss.references](#reference-provider)
- Currently lenses only work for the modules that are imported in tsx/jsx files
  - `reactTsScss.codelens` - setting for this feature
  - This setting is `OFF` by default

### Variable Completion - **[Only CSS]**

[Demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/css-variables.gif)

- Completion of variables across all the css modules
  - `reactTsScss.cssAutoComplete` - setting for this feature

### [Variable Definitions](https://code.visualstudio.com/docs/languages/css#_go-to-declaration-and-find-references) - **[Only CSS]**

- Definition of variables across all the css modules
  - `reactTsScss.cssDefinitions` - setting for this feature

### [Syntax Colors and Presentation](https://code.visualstudio.com/docs/languages/css#_syntax-coloring-color-preview) - **[Only CSS]**

- Color Presentations and color information for variables across all the css modules
  - `reactTsScss.cssSyntaxColor` - setting for this feature
    > VS codes built in support for CSS Language is limited to the current active file.So the above features are limited to active file and hence any access to variables from different modules won't work until you install React CSS modules

## Casings

This extensions supports selectors written in:

1. snake_case
2. PascalCase
3. camelCase
4. kebab-case

## Settings

Defaults

```json
{
  "reactTsScss.peekProperties": true,
  "reactTsScss.autoComplete": true,
  "reactTsScss.autoImport": true,
  "reactTsScss.definition": true,
  "reactTsScss.references": true,
  "reactTsScss.tsconfig": "./tsconfig.json",
  "reactTsScss.baseDir": "src",
  "reactTsScss.diagnostics": true,
  "reactTsScss.cssAutoComplete": true,
  "reactTsScss.cssDefinitions": true,
  "reactTsScss.cssSyntaxColor": true,
  "reactTsScss.tsCleanUpDefs": true,
  "reactTsScss.cleanUpDefs": [
    "*.module.css",
    "*.module.scss",
    "*.module.sass",
    "*.module.less",
    "*.module.styl"
  ],
  "reactTsScss.codelens": false,
  "reactTsScss.renameSelector": true
}
```

## Roadmap

1. Plain selectors without any reference is a `no op` in the current version and is expected to be added in coming versions
2. Support for stylus will be added in the future versions

## Contribution

Check out the contribution [guide](CONTRIBUTING.md)
