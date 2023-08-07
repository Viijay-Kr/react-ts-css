import { Button } from "ui";
import styles from '@styles/app.module.scss';
import buttonStyles from 'ui/Button/Button.module.css';

export default function Web() {
  return (
    <div>
      <h1 className={styles.title}>Web</h1>
      <Button />
    </div>
  );
}
