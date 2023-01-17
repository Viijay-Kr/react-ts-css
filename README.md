# React CSS modules

<img height="24"  src="images/build.png" /> <img src="images/license.png" height="24" /> <img src="images/tests.png" height="24" />
<img height="24" src="images/version.png" />

VS Code extenstion that enables CSS modules intellisense for your React projects written in typescript.

Currently supports CSS,SCSS,Less modules with the following capabilities

> This extension is uniuque interms of support for major types of [Casings](#casings) and different types of css class selectors
> 
> Different types of selectors are supported
> - Root selectors
> - Nested Selectors
> - Suffixed Selectors([scss only](https://sass-lang.com/documentation/style-rules/parent-selector#adding-suffixes))
> - Deeply nested suffix selectors
### [Definitions](https://code.visualstudio.com/api/references/vscode-api#DefinitionProvider)
- Go to any type of selector definition from your React Components
  
  <img src='./assets/definitions.gif' alt="definitions" />

### [Hover](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)
  - Peek CSS properties of a selector on hover
  
    <img src='./assets/hover.gif' alt="hover" />

### [Completions](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

  - Completion of selectors 
    
    <img src='./assets/autocomplete.gif' alt="completions" />

  - Completion of style identifiers with automatic import of closest (s)css module
  
    <img src='./assets/auto-import.gif' alt="auto-import-on-completions" />

### [Diagnostics](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic)
  - Useful diagnostics information are provided for missing selector
  
    <img src="./assets/missing-selector.png" alt="missing-selector-warning" />
  - Module not found error is also provided for non existing css modules
  
    <img src="./assets/missing-module.png" alt="missing-module" />
  
  - Settings to change diagnostics
    - `reactTsCSS.diagnostics` - Toggle to turn off diagnostics
    - `reactTsScss.tsconfig` - Base TS Config path in the project.Useful for resolving path aliases. Defaults to './tsconfig.json'
    - `reactTsScss.baseDir` - Root directory of your project. Useful if tsconfig doesn't have information about path aliases.Defaults to 'src'

### [Code Actions](https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings)
 - Code Actions to quick fix misspelled selectors
 - Code Actions to add a non existing selector to the corresponding css/scss module

   <img src="./assets/code-actions.gif" alt="code-actions" />

  


## Casings 
This extensions supports selectors written in 
1. snake_case
2. camelCase 
3. kebab-case

## Settings

Defaults

```json
{
  "reactTsCSS.peek": true, // Hover
  "reactTsCSS.autoComplete": true, // Completion
  "reactTsCSS.autoImport": true, // Auto import modules
  "reactTsCSS.definition": true, // Definition
  "reactTsCSS.tsconfig":"./tsconfig.json", // TS config path in workspace
  "reactTsCSS.baseDir":"src", // Root directory of your application
  "reactTsCSS.diagnostics":true, // Diagnostics
}
```

## RoadMap

1. Plain selectors without any reference is a `no op` in the current version and is expected to be added in coming versions
2. Current support is limited to typescript and typescript react. JSX support is considered for upcoming releases
3. Support for stylus will be added in the future versions
4. [Reference provider](https://code.visualstudio.com/api/references/vscode-api#ReferenceProvider) - Find all references of a selector from inside a css module
5. [Rename Provider](https://code.visualstudio.com/api/references/vscode-api#RenameProvider) - Rename a selector and get all the places updated
