import styles from "./PsuedoSelectors.module.css";

function classNames(...args: any[]): string | undefined {
  throw new Error("Function not implemented.");
}

export const Foo = ({ isActive }: { isActive: boolean }) => {
  return (
    <div
      className={classNames({
        [styles.primary]: true,
        [styles.active]: isActive,
      }, styles.secondary, styles.where, styles.hello)}
    >
      foo
    </div>
  );
};
