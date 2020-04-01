import Link from "next/link";
import { withRouter } from "next/router";
import styles from "../styles/components/header.module.scss";

export default withRouter(({ router }) => {
  return (
    <>
      <header>
        <div className={styles.navigation_wrapper}>
          <div className="logo">
            <Link href="/">
              <a>
                <img src="/images/poop.png" alt="Oh Shit Logo" />
              </a>
            </Link>
          </div>
          <div className={styles.title}>
            <h1>oopsie poopsie...</h1>
          </div>

          <div className={styles.new_game} />
        </div>
      </header>
    </>
  );
});
