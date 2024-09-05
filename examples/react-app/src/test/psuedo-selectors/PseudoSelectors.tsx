import styles from "./PseudoSelectors.module.css";

function classNames(...args: any[]): string | undefined {
  return args.join("\t");
}

export const Foo = ({ isActive }: { isActive: boolean }) => {
  return (
    <div
      className={classNames(
        {
          [styles.primary]: true,
          [styles.active]: isActive,
        },
        styles.secondary,
        styles.where,
        styles.hello
      )}
    >
      foo
    </div>
  );
};
