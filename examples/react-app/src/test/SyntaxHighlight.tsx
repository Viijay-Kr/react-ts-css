import styles from "./styles/SyntaxHighlight.module.scss";
import TestStyles from './styles/TestStyles.module.scss';
import TestStyles1 from './styles/TestStyles1.module.css';

export default function SyntaxHighlight() {
  return <div className={styles.bodyBold}>
    <span className={styles.snake_case}></span>
    <div className={TestStyles['test-container-test-suffix']}></div>
    <h2 className={TestStyles1['sibling-child']}></h2>
    <button className={styles.snake_case}></button>
    <span className={TestStyles['test-container-test-suffix']}></span>
    <p className={TestStyles["test-sibling"]}></p>
  </div>;
}
