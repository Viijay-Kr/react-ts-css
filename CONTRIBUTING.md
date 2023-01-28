Any type of contribution to the extension is very much welcome.

If you find an issue/bug in the extension please use the bug report template

If you would like to request a feature please use the feature request template


## Code Contribution
Before making any code level contributions, please open a issue if the contribution is major

If a contribution is minor such as  doc updates or typo fix feel free to open a PR from your fork to `main` 

## Getting Started

To debug the extension locally follow the below steps 

1. Clone the repo. `cd` into the project
2. run `npm install` in your favourite terminal
3. open the project in vs code
4. Press `F5`. This will compile and run the extension in a new Extension Development Host window.
   1. If you run into any issues follow this [guide](https://code.visualstudio.com/api/get-started/your-first-extension)

To debug the tests I strongly recommend to follow this [guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension#debugging-the-tests)

> Its better  not to run tests locally in command line as it downloads a copy VS code and it might conflict with the  version of VS code installed in your machine. 
> Using VS code debugger to run the tests is more than sufficient and offers good experience