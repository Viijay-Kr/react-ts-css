import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import styles from "standard/button.module.css";
import rootStyles from 'styles/root.module.css';
import rootStyles2 from 'styles/root2.module.css';



function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className={rootStyles['hello']}>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1 className={rootStyles2['hello-world']}>Vite + React</h1>
      <div className="card">
        <button
          className={styles['flex']}
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
