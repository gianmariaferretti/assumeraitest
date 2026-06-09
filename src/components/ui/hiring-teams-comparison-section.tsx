"use client";

import { Check, Minus, X, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

export type ComparisonStatus = "positive" | "negative" | "neutral";
type CompetitorKey = "assumerai" | "jobBoards" | "aiPlatforms" | "staffing";
type ComparisonCell = string | { text: string; status: ComparisonStatus };
type ComparisonRow = {
  criterion: string;
} & Record<CompetitorKey, ComparisonCell>;
type CriterionColumn = {
  key: "criterion";
  title: string;
};
type ValueColumn = {
  highlighted?: boolean;
  key: CompetitorKey;
  label: string;
  title: string;
};
type ComparisonColumn = CriterionColumn | ValueColumn;

export type HiringTeamsComparisonCopy = {
  caption: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  statusLabels: Record<ComparisonStatus, string>;
  subtitle: string;
  title: string;
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
    },
  },
};

const revealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.58,
      ease: easeOut,
    },
  },
};

const tableRowsVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.035,
    },
  },
};

const rowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: easeOut,
    },
  },
};

const statusMeta: Record<
  ComparisonStatus,
  {
    Icon: LucideIcon;
    className: string;
  }
> = {
  positive: {
    Icon: Check,
    className: "bg-[var(--page-accent-soft)] text-[color:var(--page-text)] ring-[color:var(--page-border)]",
  },
  negative: {
    Icon: X,
    className: "bg-[var(--page-surface)] text-[color:var(--page-text-muted)] ring-[color:var(--page-border)]",
  },
  neutral: {
    Icon: Minus,
    className: "bg-[var(--page-accent-surface)] text-[color:var(--page-text-muted)] ring-[color:var(--page-border)]",
  },
};

export function HiringTeamsComparisonSection({ copy }: { copy: HiringTeamsComparisonCopy }) {
  const prefersReducedMotion = useReducedMotion();
  const revealInitial = prefersReducedMotion ? "visible" : "hidden";

  return (
    <motion.section
      aria-labelledby="hiring-teams-comparison-title"
      className="comparisonSection relative isolate overflow-x-clip px-[clamp(18px,4vw,64px)] py-[clamp(56px,7vw,96px)] text-white"
      initial={revealInitial}
      style={{
        background:
          "radial-gradient(circle at 18% 0%, var(--page-warm-glow), transparent 30%), radial-gradient(circle at 82% 12%, var(--page-blue-glow), transparent 34%), linear-gradient(135deg, var(--page-dark) 0%, var(--page-dark-soft) 52%, var(--page-dark-violet) 100%)",
      }}
      viewport={{ amount: 0.18, once: true }}
      whileInView="visible"
    >
      <motion.div
        className="comparisonInner mx-auto max-w-[1180px]"
        variants={sectionVariants}
      >
        <motion.header variants={sectionVariants}>
          <motion.h2
            className="comparisonTitle max-w-[760px] text-balance text-[clamp(2.2rem,4.2vw,4.75rem)] font-[750] leading-[0.95] tracking-[-0.055em] text-white"
            id="hiring-teams-comparison-title"
            variants={revealVariants}
          >
            {copy.title}
          </motion.h2>
          <motion.p
            className="comparisonSubtitle mt-[18px] max-w-[680px] text-[clamp(1rem,1.25vw,1.2rem)] font-[450] leading-[1.55] text-white/68"
            variants={revealVariants}
          >
            {copy.subtitle}
          </motion.p>
        </motion.header>

        <motion.div
          className="comparisonCard relative mt-[clamp(36px,5vw,64px)] overflow-hidden rounded-[clamp(22px,2vw,34px)] border border-white/18 bg-[var(--page-surface-strong)] shadow-[0_28px_90px_var(--page-dark-shadow),0_0_70px_var(--page-violet-glow)] backdrop-blur-[16px]"
          variants={revealVariants}
        >
          <div className="comparisonScroller relative overflow-x-auto p-2.5 pr-6 [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:var(--page-border)_transparent] sm:p-4">
            <table className="comparisonTable w-full min-w-[820px] table-fixed border-separate border-spacing-0 sm:min-w-[920px]">
              <caption className="sr-only">
                {copy.caption}
              </caption>
              <colgroup>
                <col className="w-[145px] sm:w-[22%]" />
                <col className="w-[188px] sm:w-[19.5%]" />
                <col className="w-[188px] sm:w-[19.5%]" />
                <col className="w-[188px] sm:w-[19.5%]" />
                <col className="w-[188px] sm:w-[19.5%]" />
              </colgroup>
              <thead>
                <tr>
                  {copy.columns.map((column) => (
                    <th
                      className={getHeaderClassName(column)}
                      key={column.key}
                      scope="col"
                    >
                      <span className="block text-[0.92rem] font-[760] leading-tight">
                        {column.title}
                      </span>
                      {"label" in column ? (
                        <span className="mt-1.5 block text-[0.68rem] font-[650] uppercase leading-tight tracking-[0.08em] text-current opacity-55">
                          {column.label}
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={tableRowsVariants}>
                {copy.rows.map((row, rowIndex) => (
                  <motion.tr key={row.criterion} variants={rowVariants}>
                    {copy.columns.map((column) => {
                      if (column.key === "criterion") {
                        return (
                          <th
                            className="sticky left-0 z-20 h-[54px] border-t border-r border-[color:var(--page-border)] bg-[var(--page-surface-strong)] px-2.5 py-3 text-left align-middle text-[0.72rem] font-[760] leading-tight text-[color:var(--page-text)] shadow-[8px_0_18px_var(--page-shadow)] backdrop-blur sm:h-[58px] sm:px-5 sm:py-3.5 sm:text-[0.82rem]"
                            key={`${row.criterion}-${column.key}`}
                            scope="row"
                          >
                          {row.criterion}
                        </th>
                      );
                    }

                      return (
                        <td
                          className={getBodyCellClassName(column, rowIndex, copy.rows.length)}
                          key={`${row.criterion}-${column.key}`}
                        >
                          {renderComparisonCell(row[column.key], copy.statusLabels)}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
          <span
            aria-hidden="true"
            className="comparisonStickyRailMask pointer-events-none absolute inset-y-0 left-0 z-10 w-[155px] bg-[var(--page-surface-strong)] shadow-[8px_0_18px_var(--page-shadow)] sm:w-[218px] lg:hidden"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--page-surface-strong)] to-transparent sm:w-16 lg:hidden"
          />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

function getHeaderClassName(column: ComparisonColumn) {
  if (column.key === "criterion") {
    return "sticky left-0 z-30 rounded-tl-[18px] border-r border-[color:var(--page-border)] bg-[var(--page-surface-strong)] px-2.5 py-3.5 text-left align-bottom text-[color:var(--page-text)] shadow-[8px_0_18px_var(--page-shadow)] backdrop-blur sm:rounded-tl-[20px] sm:px-5 sm:py-4";
  }

  if (column.highlighted) {
    return "assumerHeader z-10 rounded-t-[22px] bg-[linear-gradient(180deg,var(--page-lilac-surface)_0%,var(--page-blue-surface)_100%)] px-4 py-4 text-left align-bottom text-[color:var(--page-text)] shadow-[inset_1px_0_0_var(--page-border),inset_-1px_0_0_var(--page-border),inset_0_1px_0_rgba(255,255,255,0.62)] sm:px-5";
  }

  return "px-4 py-4 text-left align-bottom text-[color:var(--page-text)] sm:px-5";
}

function getBodyCellClassName(
  column: ValueColumn,
  rowIndex: number,
  rowCount: number,
) {
  const baseClassName =
    "h-[58px] border-t px-4 py-3.5 align-middle text-[0.86rem] font-[560] leading-snug sm:px-5";

  if (!column.highlighted) {
    return `${baseClassName} border-[color:var(--page-border)] text-[color:var(--page-text-muted)]`;
  }

  const roundedClassName =
    rowIndex === rowCount - 1 ? " rounded-b-[22px]" : "";

  return `${baseClassName} assumerColumn border-[color:var(--page-border)] bg-[linear-gradient(180deg,var(--page-accent-soft)_0%,var(--page-blue-surface)_100%)] text-[color:var(--page-text)] shadow-[inset_1px_0_0_var(--page-border),inset_-1px_0_0_var(--page-border)]${roundedClassName}`;
}

function renderComparisonCell(
  cell: ComparisonCell,
  statusLabels: Record<ComparisonStatus, string>,
) {
  if (typeof cell === "string") {
    return <span>{cell}</span>;
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <StatusIcon label={statusLabels[cell.status]} status={cell.status} />
      <span>{cell.text}</span>
    </span>
  );
}

function StatusIcon({
  label,
  status,
}: {
  label: string;
  status: ComparisonStatus;
}) {
  const { Icon, className } = statusMeta[status];

  return (
    <span
      aria-label={label}
      className={`statusIcon inline-flex size-[22px] flex-none items-center justify-center rounded-full ring-1 ${className}`}
      role="img"
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.35} />
    </span>
  );
}
