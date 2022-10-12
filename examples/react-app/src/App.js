"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_svg_1 = require("./assets/react.svg");
require("./App.css");
function App() {
    const [count, setCount] = (0, react_1.useState)(0);
    return (<div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo"/>
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={react_svg_1.default} className="logo react" alt="React logo"/>
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>);
}
exports.default = App;
//# sourceMappingURL=App.js.map