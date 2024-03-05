## 2.6.0

## 3.0.0

### Major Changes

- 7c1c6f2: References and Code lenses with improved run time performance

### Patch Changes

- f25c5f3: feat(CSS): rename selector across references
- 55feade: feat(CSS): references and code lenses for css language

- 55feade: References and Code lenses for CSS langauge

## 2.5.1

### Patch Changes

- 14175f6: intellisense for selectors declared inside mixin references

## 2.5.0

### Minor Changes

- a1255ec: CSS nesting child selectors is fixed after updating the vscode-css-langauge service package

### Patch Changes

- fee2676: Introducing changesets to automate versioning changelog and publishing to marketplace
- 48da59c: chore: fix the osvx publish step

## [2.4.0]

- Add support for (SCSS) suffix selectors starting with &\_\_ (used by BEM)

## [2.3.3]

- Fix path aliases diagnostics when jsconfig aliases is used in the project [#109](https://github.com/Viijay-Kr/react-ts-css/issues/109)

## [2.3.2]

- Fix module not found error upon renaming files [Viijay-Kr/react-ts-css#111](https://github.com/Viijay-Kr/react-ts-css/issues/111)

## [2.3.1]

- Disabling css code lens and references feature to prevent high CPU load - Closes [Viijay-Kr/react-ts-css#107](https://github.com/Viijay-Kr/react-ts-css/issues/107)

## [2.3.0]

- Improved CSS langauge features
  - code lens and find all references of css selector

## [2.2.0]

- Refactoring of Store and Parser
- Memory optimization

## [2.1.2]

- Fix module resolution using ts configs without path aliases

## [2.1.1]

- Fix a incorrect module resolution problem in Windows - Closes [Viijay-Kr/react-ts-css#93](https://github.com/Viijay-Kr/react-ts-css/issues/93) & [Viijay-Kr/react-ts-css#101](https://github.com/Viijay-Kr/react-ts-css/issues/101)

## [2.1.0]

- TS Config path alias support
  - Support in monorepo setup
  - Support in polyrepo setup

## [2.0.0]

- Fix open vsx publish job

## [1.9.9]

- Publish to Open VSX

## [1.9.6]

- Fix typo in docs

## [1.9.5]

- updated the version badge

## [1.9.4]

- Dynamic References to selectors is not considered for diagnostics - Partially fixes [#86](https://github.com/Viijay-Kr/react-ts-css/issues/86)

## [1.9.3]

- Disabling References and Code lens due to performance issue

## [1.9.2]

- Fix newly added selector resolution issue

## [1.9.1]

- Suffix selector without hypen prefix is handled - Fixes [82](https://github.com/Viijay-Kr/react-ts-css/issues/82)

## [1.9.0]

- Javascript language support - Closes [#80](https://github.com/Viijay-Kr/react-ts-css/issues/80)

## [1.8.0]

- Code Lens Provider integration for selector referenceses [#76](https://github.com/Viijay-Kr/react-ts-css/issues/76)
- Some minor refactoring/renaming of Providers

## [1.7.0]

- Reference Provider for Selectors - Closes [#74](https://github.com/Viijay-Kr/react-ts-css/issues/74)
  - Find reference of a selector across various TS/TSX modules

## [1.6.6]

- readme updated to have the right setting name

## [1.6.5]

- Update typescript clean up definitions plugin
  - Refinement of definitions results by the plugin - See [#1](https://github.com/Viijay-Kr/typescript-cleanup-defs/pull/1)
- Changes to existings settings
  - `typecriptCleanUpDefs` is changed to `tsCleanUpDefs`
  - `cleanUpDefs` now takes a list of module extensions as default values

## [1.6.4]

- Not ignoring node_modules from .vscodeignore - May be Closes [#68](https://github.com/Viijay-Kr/react-ts-css/issues/68)

## [1.6.3]

- Maybe fix dependency injection of typescript-cleanup-definitions - May be Closes [#68](https://github.com/Viijay-Kr/react-ts-css/issues/68)

## [1.6.2]

- Fixed Multiple Entries on Go to Definition
  - Unnecessary definition results from declaration modules for css classes can be avoided - Closes [#68](https://github.com/Viijay-Kr/react-ts-css/issues/68)

## [1.6.1]

- CSS Parser
  - Resolve selectors inside media queries - Closed [#66](https://github.com/Viijay-Kr/react-ts-css/issues/66)

## [1.6.0]

- CSS Language Features
  - Completion of CSS Variables
  - Go to Definitions of CSS variables
  - Syntax coloring for CSS variables
- Minor Refactoring of providers into their own language providers

## [1.5.5]

- Minor Refactorings of Providers

## [1.5.4]

- No Diagnostic warning for empty string - Closes [#52](https://github.com/Viijay-Kr/react-ts-css/issues/52)

## [1.5.3]

- Fix documentation typos

## [1.5.2]

- Fix windows

## [1.5.1]

- Ignore quick fix to ignore selector diagnostics temproarily - Closes [#52](https://github.com/Viijay-Kr/react-ts-css/issues/52)

## [1.5.0]

- Less support is added from 1.5.0 (only modules with .module extension is supported)
- Deeper suffix selectors are also resolved now

## [1.4.0]

## Code Actions For Diagnostics

- 1.4.0 support Code Actions for Selector related Diagnostics - Closes [#45](https://github.com/Viijay-Kr/react-ts-css/issues/45)
  - get Code Action to change spelling of a misspelled selector by providing the closest match or add a new selector to the module
  - In the event of non existing selector ,get a Code Action to add the selector to the css module
- Future versions will include code actions to fix all selector related warnings
- Future versions will include code actions to fix all import related problems

## [1.3.9]

- Module not found for node module assets has been fixed - [#43](https://github.com/Viijay-Kr/react-ts-css/issues/43)

## [1.3.8]

- Added useful diagnostics to non existing selectors and incorrect module import statements - Closes [#41](https://github.com/Viijay-Kr/react-ts-css/issues/41)
- New Settings have been added to resolve diagnostics
  - `reactTsCSS.diagnostics` - Toggle to turn off diagnostics
  - `reactTsScss.tsconfig` - Base TS Config path in the project - Default './tsconfig.json'
  - `reactTsScss.baseDir` - Root directory of your project - Default 'src'

## [1.3.7]

- This release contains Major updates to the parsing logic. This improves the following problems - [#37](https://github.com/Viijay-Kr/react-ts-css/issues/37)
  - Conflicts in suffixed selectors - [#18](https://github.com/Viijay-Kr/react-ts-css/issues/18)
  - Clean up of completion list by removing pusedo selectors
  - Start up time boost
  - Memory optimization
  - Performance improvements - Altough this is an intuitive assumption
- 1.3.7 removes the cyclic dependency mentioned [here](https://github.com/Viijay-Kr/react-ts-css#current-feasibilities) in point 4. From 1.3.7 cyclic dependencies injection will become no op

## [1.3.6]

- Removes the start up message on activate - Closes [#38](https://github.com/Viijay-Kr/react-ts-css/issues/38)

## [1.3.5]

- Update: The auto import feature now only includes modules in the same directory - closes [#20](https://github.com/Viijay-Kr/react-ts-css/issues/20#issuecomment-1379073856)

## [1.3.4]

- Update doc to highlight the casing support

## [1.3.2]

- Auto import modules on completion selection of default export identifier - Closes [#20](https://github.com/Viijay-Kr/react-ts-css/issues/20)

## [1.3.1]

- Extensions Agnostic Syntax highlighting on hover using markdown syntax - Fixes [#19](https://github.com/Viijay-Kr/react-ts-css/issues/19)

## [1.3.0]

- Workflows have been setup to automate jobs in github - **NO BREAKING CHANGE** - Closes [#23](https://github.com/Viijay-Kr/react-ts-css/issues/23)

## [1.2.3]

- Fix broken activation logic when AST encounters an error - fixes [#21](https://github.com/Viijay-Kr/react-ts-css/issues/21)

## [1.2.2]

- Minor meta data update

## [1.2.1]

- Doc updates for 1.2.0

## [1.2.0]

- Camel case support
- Parsing improvements

## [1.1.1] - 2022-10-14

- Updated changelog file

## [1.1.0] - 2022-10-14

## Fixes

- Fixed the unrsolved css file issue

## [1.0.0] - 2022-10-14

### FeatureSet

- Definition Provider
- Completion Provider
- Hover Provider
- Cyclic selectors
- Suffix selectors
