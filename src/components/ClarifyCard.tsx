"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Field,
  Input,
  Panel,
  RadioGroup,
} from "@robr0/design-system";

import styles from "./ClarifyCard.module.css";

export interface ClarifyCardProps {
  step: number;
  total: number;
  topicLabel: string;
  question: string;
  options: string[];
  disabled?: boolean;
  onContinue: (answer: string) => void;
  onSkip: () => void;
}

export function ClarifyCard({
  step,
  total,
  topicLabel,
  question,
  options,
  disabled = false,
  onContinue,
  onSkip,
}: ClarifyCardProps) {
  const t = useTranslations();
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");

  const answer = custom.trim() || selected;
  const canContinue = answer.length > 0 && !disabled;

  const stepLabel = t("optimizeClarifyStep", {
    step: String(step),
    total: String(total),
    topic: topicLabel,
  });

  return (
    <Panel className={styles.card} padding="default">
      <div className={styles.header}>
        <p className={styles.step}>{stepLabel}</p>
        <p className={styles.question}>{question}</p>
      </div>

      <RadioGroup
        name={`clarify-${step}-${question.slice(0, 24)}`}
        options={options.map((option) => ({
          label: option,
          value: option,
          disabled,
        }))}
        value={custom.trim() ? "" : selected}
        direction="vertical"
        onValueChange={(value) => {
          if (disabled) return;
          setSelected(value);
          setCustom("");
        }}
        className={styles.radios}
      />

      <div className={styles.footer}>
        <Field className={styles.somethingElse} size="compact">
          <Input
            size="compact"
            iconLeft="edit"
            placeholder={t("optimizeClarifySomethingElse")}
            value={custom}
            disabled={disabled}
            aria-label={t("optimizeClarifySomethingElse")}
            onValueChange={(value) => {
              setCustom(value);
              if (value.trim()) setSelected("");
            }}
          />
        </Field>
        <div className={styles.actions}>
          <Button
            label={t("optimizeClarifySkip")}
            variant="secondary"
            size="compact"
            disabled={disabled}
            onClick={() => onSkip()}
          />
          <Button
            label={t("optimizeClarifyContinue")}
            variant="primary"
            size="compact"
            disabled={!canContinue}
            onClick={() => {
              if (!canContinue) return;
              onContinue(answer);
            }}
          />
        </div>
      </div>
    </Panel>
  );
}
