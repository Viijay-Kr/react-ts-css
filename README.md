<h1>React CSS modules</h1>

<img height="24"  src="images/build.png" /> <a href="https://github.com/Viijay-Kr/react-ts-css/blob/main/LICENSE" target="__blank"><img src="images/license.png" height="24" /></a> <img src="images/tests.png" height="24" />
<a href="https://marketplace.visualstudio.com/items?itemName=viijay-kr.react-ts-css" target="__blank"><img height="24" src="images/version.png" /></a>

VS Code extension that enables CSS modules IntelliSense for your React projects written in TypeScript.
Currently supports CSS, SCSS, Less modules 

This extension also supports CSS language features which are not supported by built in vscode [code css langauge fetures](https://github.com/microsoft/vscode-css-languageservice). Check [CSS language features](#css-langauge-features) for more info

> This extension is unique in terms of support for major types of [Casings](#casings) and different types of CSS class selectors
> 
> Different types of selectors are supported
> - Root selectors
> - Nested selectors
> - Suffixed selectors ([SCSS only](https://sass-lang.com/documentation/style-rules/parent-selector#adding-suffixes))
> - Deeply nested suffix selectors
>
> Almost all project scaffolders such as Vite, Next.js and CRA add css module declaration to the project by injecting it in a `.d.ts` file (for instance inside `node_modules/vite/client.d.ts` added by Vite). TypeScript treats these definitions as definition provider for Style properties. This results in a useless definition result when VS Code `Go to Definition` is triggered. Check this [issue](https://github.com/Viijay-Kr/react-ts-css/issues/68).
> 
> This extension gives you an option to eliminate the useless results by using the TypeScript plugin [typescript-cleanup-defs](https://www.npmjs.com/package/typescript-cleanup-definitions) that can filter out those definitions results. Check the plugin for more details.
>
> Override this plugin using the setting `reactTsScss.typecriptCleanUpDefs`


<h2>Capabilities</h2>

- [TS/TSX Language Features](#tstsx-language-features)
  - [Definitions](#definitions)
  - [Hover](#hover)
  - [Completions](#completions)
  - [Diagnostics](#diagnostics)
  - [Code Actions](#code-actions)
- [CSS Langauge Features](#css-langauge-features)
  - [Variable Completion](#variable-completion)
  - [Variable Definitions](#variable-definitions)
  - [Syntax Colors and Presentation](#syntax-colors-and-presentation)
- [Casings](#casings)
- [Settings](#settings)
- [Roadmap](#roadmap)

## TS/TSX Language Features
### [Definitions](https://code.visualstudio.com/api/references/vscode-api#DefinitionProvider)

- Go to any type of selector definition from your React components - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/definitions.gif)

### [Hover](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

- Peek CSS properties of a selector on hover - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/hover.gif)

### [Completions](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

- Completion of selectors - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/autocomplete.gif)
- Completion of style identifiers with automatic import of closest (S)CSS module - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/auto-import.gif)

### [Diagnostics](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic)
- Useful diagnostics information are provided for missing selector - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/missing-selector.png)
- Module not found error is also provided for non existing CSS modules - [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/missing-module.png)
- Settings to change diagnostics
  - `reactTsCSS.diagnostics` - Toggle to turn off diagnostics
  - `reactTsScss.tsconfig` - Base TS Config path in the project.Useful for resolving path aliases. Defaults to './tsconfig.json'
  - `reactTsScss.baseDir` - Root directory of your project. Useful if tsconfig doesn't have information about path aliases.Defaults to 'src'

### [Code Actions](https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings)

- Code Action to quick fix misspelled selectors
- Code Action to add a non existing selector to the corresponding CSS/SCSS module
- Code Action to ignore warnings temporarily
- [demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/code-actions.gif)

## CSS Langauge Features
 [Demo](https://github.com/Viijay-Kr/react-ts-css/tree/main/assets/css-variables.gif)
### Variable Completion
- Completion of variables across all the css modules 
### [Variable Definitions](https://code.visualstudio.com/docs/languages/css#_go-to-declaration-and-find-references) 
- Definition of variables across all the css modules
### [Syntax Colors and Presentation](https://code.visualstudio.com/docs/languages/css#_syntax-coloring-color-preview)
- Color Presentations and color information for variables across all the css modules

> VS codes built in support for CSS Langauge is limited to the current active file.So the above features are limited to active file and hence any access to variables from different modules won't work until you install React CSS modules
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
  "reactTsCSS.peek": true, 
  "reactTsCSS.autoComplete": true, 
  "reactTsCSS.autoImport": true, 
  "reactTsCSS.definition": true, 
  "reactTsCSS.tsconfig":"./tsconfig.json", 
  "reactTsCSS.baseDir":"src", 
  "reactTsCSS.diagnostics":true, 
  "reactTsCSS.cssAutoComplete":true, 
  "reactTsCSS.cssDefinitions":true, 
  "reactTsCSS.cssSyntaxColor":true, 
  "reactTsCSS.tsCleanUpDefs":true, 
  "reactTsCSS.cleanUpDefs": [
      "*.module.css",
      "*.module.scss",
      "*.module.sass",
      "*.module.less",
      "*.module.styl"
  ]
}
```

## Roadmap

1. Plain selectors without any reference is a `no op` in the current version and is expected to be added in coming versions
2. Current support is limited to TypeScript and TypeScript React - JSX support is considered for upcoming releases
3. Support for stylus will be added in the future versions
4. [Reference Provider](https://code.visualstudio.com/api/references/vscode-api#ReferenceProvider) - Find all references of a selector from inside a CSS module
5. [Rename Provider](https://code.visualstudio.com/api/references/vscode-api#RenameProvider) - Rename a selector and get all the places updated
