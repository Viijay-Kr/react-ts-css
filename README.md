# React CSS modules

<img src="images/build.png" /> <img src="images/license.png" /> <img src="images/tests.png" />
<img src="images/version.png" />

VS Code extenstion that enables  CSS modules support for your React projects written in typescript.

Currently supports CSS and SCSS modules with the following capabilities

- [Definitions](https://code.visualstudio.com/api/references/vscode-api#DefinitionProvider)

  - Root selectors
  - Nested Selectors
  - Suffixed Selectors([scss only](https://sass-lang.com/documentation/style-rules/parent-selector#adding-suffixes))
  
  - <img src='./assets/definitions.gif' alt="definitions" />
> Major  types of casing is supported. Check the [Casings](#casings) section
- [Hover](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

  - Peek properties on hover

  - <img src='./assets/hover.gif' alt="hover" />

- [Completions](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)

  - Completion of all types of selectors
  
  - <img src='./assets/autocomplete.gif' alt="completions" />
  
  - Completion of style identifiers with automatic import of corresponding (s)css module

  - <img src='./assets/auto-import.gif' alt="auto-import-on-completions" />

## Casings 
This extensions supports selectors written in 
1. snake_case
2. camelCase 
3. kebab-case

## Settings

Defaults

```json
{
  "reactTsCSS.peek": true,
  "reactTsCSS.autoComplete": true,
  "reactTsCSS.autoImport": true,
  "reactTsCSS.definition": true
}
```

## Current Feasibilities

1. This extension supports only on typescript react projects using CSS/SCSS modules.
2. In order for the features to work smoothly, the selectors must have a reference to a CSS module.
3. The extension Supports features for
   - Nested selectors
   - Sibling selectors
   - [Suffix Selectors](https://sass-lang.com/documentation/style-rules/parent-selector#adding-suffixes)
4. Cyclic dependencies are also resolved and selectors are added recursively
   - for instance if a `SCSSModule` includes selectors from a normal sass file (using `@import` or `@use` rules) , those selectors can be accessed by the extension

## RoadMap

1. Plain selectors without any reference is a `no op` in the current version and is expected to be added in coming versions
2. Current support is limited to typescript and typescript react. JSX support is considered for upcoming releases
3. Support for less and stylus will be added in the future versions
4. [Reference provider](https://code.visualstudio.com/api/references/vscode-api#ReferenceProvider) - Find all references of a selector from inside a css module
5. [Rename Provider](https://code.visualstudio.com/api/references/vscode-api#RenameProvider) - Rename a selector and get all the places updated
