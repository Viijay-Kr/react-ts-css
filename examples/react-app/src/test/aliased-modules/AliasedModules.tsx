import styles from "@d/DuplicateSelectors.module.scss";
import buttonCss from "@s/button.module.css";

export default function () {
  return (
    <div className={styles.flex}>
      <p className={buttonCss["btn-secondary"]}></p>
    </div>
  );
}
