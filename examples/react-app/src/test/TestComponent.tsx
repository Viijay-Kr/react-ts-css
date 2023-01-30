/** Dont modify this File. Used by the test runner **/
import React from "react";
import TestStyles from "./styles/TestStyles.module.scss";

export const TestComponent = () => {
  return (
    <div className={TestStyles["test-container"]}>
      <h2 className={TestStyles["test-container-test-suffix"]}>
        This is a test component
      </h2>
      <span className={TestStyles["test-child"]}></span>
      <section className={TestStyles["test-sibling"]}></section>
      <p className={TestStyles["test-sibling"]}></p>
      <p className={TestStyles["test-container-test-suffix"]}></p>
      <span className={TestStyles.testCamelCase}></span>
      <span className={TestStyles["non-existing-selector"]}></span>
    </div>
  )
};
