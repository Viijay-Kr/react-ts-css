import styles from './DuplicateSelectors.module.scss';

export const DuplicateSelector = ()=>{
    return <div className={styles['flex-column']}>
        <span className={styles['flex-row']}></span>
        <span className={styles['flex']}></span>
        <h2 className={styles.grid}></h2>
        <h2 className={styles['grid-row']}></h2>
        <h2 className={styles['flex-row']}></h2>
        <span className={styles['grid-row']}></span>
        <h3 className={styles['flex-row']}></h3>
        <h4 className={styles['grid-row']}></h4>
    </div>
}