import styles from "./DynamicClasses.module.scss";

export const DynamicClasses = ({ size }: { size: "sm" | "md" | "lg" }) => {
  return <div className={styles[size]}></div>;
};
