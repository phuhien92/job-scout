import { Panel } from "@robr0/design-system";

import styles from "./TargetingSummary.module.css";

export interface TargetingAnswer {
  question: string;
  answer: string;
}

interface Props {
  items: TargetingAnswer[];
}

export function TargetingSummary({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Panel className={styles.card} padding="compact">
      <dl className={styles.list}>
        {items.map((item, index) => (
          <div key={`${item.question}-${index}`} className={styles.item}>
            <dt className={styles.q}>
              <span className={styles.prefix}>Q:</span> {item.question}
            </dt>
            <dd className={styles.a}>
              <span className={styles.prefix}>A:</span> {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
