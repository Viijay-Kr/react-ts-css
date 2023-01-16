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
