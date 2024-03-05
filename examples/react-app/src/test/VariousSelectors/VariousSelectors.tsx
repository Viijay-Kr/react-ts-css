import styles from './VariousSelectors.module.scss';
export const VariousSelector = () => {
  return <div className={styles.camelCasesuffixonemore}>
    <div className={styles.camelCasesuffix}></div>
    <div className={styles.camelCase}></div>
    <div className={styles['new-selector-added']}></div>
    <div className={styles['mixin-decl-selector']}></div>
    <div className={styles['mixin-reference-selector']}></div>
    <div className={styles['nested-mixin-reference-selector']}></div>
    <div className={styles['normal-selector-suffix-nested-suffix']}></div>
  </div>;
};
