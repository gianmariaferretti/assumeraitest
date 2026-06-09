"use client";

import { useMemo, useState } from "react";

import { formatProfileReviewConfidence } from "@/components/candidate/minimal-profile-review-fields";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";
import type {
  TargetRolePreferenceOptions,
  WorkSetupOption
} from "@/features/occupations";

interface PreferenceField {
  readonly field_path: string;
  readonly label: string;
  readonly value: string;
  readonly confidence: number | null;
}

interface CandidateProfilePreferenceFieldsProps {
  readonly targetRoleField: PreferenceField;
  readonly locationField: PreferenceField;
  readonly workModeField: PreferenceField;
  readonly targetRoleOptions: TargetRolePreferenceOptions;
  readonly workSetupOptions: readonly WorkSetupOption[];
  readonly language?: CandidateInterviewLanguageCode;
}

const locationSuggestions = [
  "Remote EU",
  "Milan",
  "Rome",
  "London",
  "Berlin",
  "Amsterdam",
  "Paris",
  "Madrid",
  "New York"
];

export function CandidateProfilePreferenceFields({
  language,
  locationField,
  targetRoleField,
  targetRoleOptions,
  workModeField,
  workSetupOptions
}: CandidateProfilePreferenceFieldsProps) {
  const copy = resolveCandidateFlowCopy(language).profileConfirm.preferences;
  const roleOptions = useMemo(
    () =>
      uniqueByLabel([
        ...targetRoleOptions.recommended,
        ...targetRoleOptions.catalog
      ]),
    [targetRoleOptions]
  );
  const recommendedRoleLabels = useMemo(
    () => new Set(targetRoleOptions.recommended.map((role) => role.label)),
    [targetRoleOptions.recommended]
  );
  const [selectedRoles, setSelectedRoles] = useState(() => parseList(targetRoleField.value));
  const [roleQuery, setRoleQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedWorkModes, setSelectedWorkModes] = useState(() =>
    parseWorkModeValues(workModeField.value, workSetupOptions)
  );

  const selectedRoleSet = useMemo(() => new Set(selectedRoles.map(normalize)), [selectedRoles]);

  const filteredRoleOptions = useMemo(() => {
    if (!roleQuery.trim()) return [];
    return roleOptions.filter(
      (role) =>
        normalize(role.label).includes(normalize(roleQuery)) &&
        !selectedRoleSet.has(normalize(role.label))
    );
  }, [roleOptions, roleQuery, selectedRoleSet]);

  const recommendedFiltered = useMemo(() => {
    return targetRoleOptions.recommended.filter(
      (role) => !selectedRoleSet.has(normalize(role.label))
    );
  }, [targetRoleOptions, selectedRoleSet]);

  const groupedCatalog = useMemo(() => {
    const groups: Record<string, typeof targetRoleOptions.catalog[number][]> = {};
    for (const role of targetRoleOptions.catalog) {
      if (selectedRoleSet.has(normalize(role.label))) continue;
      if (!groups[role.group]) {
        groups[role.group] = [];
      }
      groups[role.group].push(role);
    }
    return groups;
  }, [targetRoleOptions, selectedRoleSet]);

  const showRoleOptions = isFocused || roleQuery.trim().length > 0;

  const canAddTypedRole =
    roleQuery.trim().length > 1 &&
    !roleOptions.some((role) => normalize(role.label) === normalize(roleQuery)) &&
    !selectedRoleSet.has(normalize(roleQuery));

  function addRole(label: string) {
    const nextRole = label.trim();

    if (!nextRole || selectedRoleSet.has(normalize(nextRole))) {
      return;
    }

    setSelectedRoles((currentRoles) => [...currentRoles, nextRole]);
    setRoleQuery("");
  }

  function removeRole(label: string) {
    setSelectedRoles((currentRoles) =>
      currentRoles.filter((role) => normalize(role) !== normalize(label))
    );
  }

  function toggleWorkMode(value: WorkSetupOption["value"]) {
    setSelectedWorkModes((currentModes) =>
      currentModes.includes(value)
        ? currentModes.filter((mode) => mode !== value)
        : [...currentModes, value]
    );
  }

  return (
    <section className="pref-panel" aria-labelledby="profile-review-preferences">
      <CandidateProfilePreferenceFieldsStyles />
      <div className="pref-header">
        <p className="pref-kicker">{copy.kicker}</p>
        <h2 id="profile-review-preferences" className="pref-title">
          {copy.title}
        </h2>
        <p className="pref-description">
          {copy.description}
        </p>
      </div>

      <div className="pref-field-block">
        <div className="pref-label-row">
          <label htmlFor="target-role-search" className="pref-label-text">
            {targetRoleField.label}
          </label>
          <ConfidenceBadge confidence={targetRoleField.confidence} language={language} />
        </div>
        <input name={targetRoleField.field_path} type="hidden" value="" />
        {selectedRoles.map((role) => (
          <input
            key={role}
            name={targetRoleField.field_path}
            type="hidden"
            value={role}
          />
        ))}
        <div className="pref-combo-shell">
          <input
            aria-autocomplete="list"
            aria-controls="target-role-options"
            aria-expanded={showRoleOptions}
            aria-required="true"
            className="pref-search-input"
            id="target-role-search"
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 250);
            }}
            onChange={(event) => setRoleQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const firstOption = filteredRoleOptions[0];
                addRole(firstOption?.label ?? roleQuery);
              }
            }}
            placeholder={copy.rolePlaceholder}
            role="combobox"
            type="text"
            value={roleQuery}
          />
          <button
            type="button"
            className="pref-chevron-button"
            onClick={() => setIsFocused((prev) => !prev)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 250);
            }}
            aria-label={copy.toggleRoleChoices}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: showRoleOptions ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform var(--candidate-motion-standard)"
              }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          {showRoleOptions ? (
            <div id="target-role-options" role="listbox" className="pref-dropdown">
              {roleQuery.trim().length === 0 ? (
                <>
                  {recommendedFiltered.length > 0 ? (
                    <div className="pref-dropdown-group">
                      <div className="pref-dropdown-group-header">{copy.recommendedForYou}</div>
                      {recommendedFiltered.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => addRole(role.label)}
                          role="option"
                          aria-selected={false}
                          className="pref-option-button"
                          type="button"
                        >
                          <span>{role.label}</span>
                          <span className="pref-option-meta recommended">{copy.recommended}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {Object.entries(groupedCatalog).map(([groupName, roles]) =>
                    roles.length > 0 ? (
                      <div key={groupName} className="pref-dropdown-group">
                        <div className="pref-dropdown-group-header">{groupName}</div>
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            onClick={() => addRole(role.label)}
                            role="option"
                            aria-selected={false}
                            className="pref-option-button"
                            type="button"
                          >
                            <span>{role.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : null
                  )}
                </>
              ) : (
                <>
                  {filteredRoleOptions.length > 0
                    ? filteredRoleOptions.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => addRole(role.label)}
                          role="option"
                          aria-selected={false}
                          className="pref-option-button"
                          type="button"
                        >
                          <span>{role.label}</span>
                          <span className="pref-option-meta">
                            {recommendedRoleLabels.has(role.label) ? copy.recommended : role.group}
                          </span>
                        </button>
                      ))
                    : null}
                  {filteredRoleOptions.length === 0 && !canAddTypedRole ? (
                    <p className="pref-empty-state">{copy.noRoleMatch}</p>
                  ) : null}
                  {canAddTypedRole ? (
                    <button
                      onClick={() => addRole(roleQuery)}
                      className="pref-option-button pref-add-custom-option"
                      type="button"
                    >
                      {copy.addTypedRolePrefix} &quot;{roleQuery.trim()}&quot;{copy.addTypedRoleSuffix}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        {selectedRoles.length > 0 ? (
          <div aria-label={copy.selectedTargetRoles} className="pref-chip-grid">
            {selectedRoles.map((role) => (
              <button
                key={role}
                onClick={() => removeRole(role)}
                className="pref-selected-chip"
                type="button"
              >
                {role}
                <span aria-hidden="true">&times;</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="pref-required-hint">{copy.targetRoleRequired}</p>
        )}
      </div>

      <div className="pref-two-column-grid">
        <label htmlFor={locationField.field_path} className="pref-field-block">
            <span className="pref-label-row">
              <span className="pref-label-text">{locationField.label}</span>
            <ConfidenceBadge confidence={locationField.confidence} language={language} />
          </span>
          <input
            defaultValue={locationField.value}
            className="pref-text-input"
            id={locationField.field_path}
            list="candidate-location-suggestions"
            name={locationField.field_path}
            placeholder={copy.locationPlaceholder}
            required
            type="text"
          />
          <datalist id="candidate-location-suggestions">
            {locationSuggestions.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </label>

        <div className="pref-field-block">
          <div className="pref-label-row">
            <span className="pref-label-text">{workModeField.label}</span>
            <ConfidenceBadge confidence={workModeField.confidence} language={language} />
          </div>
          <input name={workModeField.field_path} type="hidden" value="" />
          {selectedWorkModes.map((mode) => (
            <input key={mode} name={workModeField.field_path} type="hidden" value={mode} />
          ))}
          <div className="pref-mode-grid">
            {workSetupOptions.map((option) => {
              const selected = selectedWorkModes.includes(option.value);

              return (
                <button
                  aria-pressed={selected}
                  key={option.value}
                  onClick={() => toggleWorkMode(option.value)}
                  className="pref-mode-button"
                  type="button"
                >
                  {copy.workSetupLabels[option.value]}
                </button>
              );
            })}
          </div>
          {selectedWorkModes.length === 0 ? (
            <p className="pref-required-hint">{copy.workSetupRequired}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ConfidenceBadge({
  confidence,
  language
}: {
  readonly confidence: number | null;
  readonly language?: CandidateInterviewLanguageCode;
}) {
  const label = formatProfileReviewConfidence(confidence, language);
  let badgeClass = "pref-confidence-review";

  if (confidence !== null && Number.isFinite(confidence)) {
    const normalized = confidence > 0 && confidence <= 1 ? confidence * 100 : confidence;
    if (normalized >= 80) {
      badgeClass = "pref-confidence-high";
    } else {
      badgeClass = "pref-confidence-check";
    }
  }

  return (
    <span className={`pref-confidence-badge ${badgeClass}`}>
      {label}
    </span>
  );
}

function parseList(value: string): string[] {
  return uniqueStrings(
    value
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parseWorkModeValues(
  value: string,
  options: readonly WorkSetupOption[]
): WorkSetupOption["value"][] {
  const allowedValues = new Set(options.map((option) => option.value));
  const valueByLabel = new Map(
    options.map((option) => [normalize(option.label), option.value] as const)
  );

  return parseList(value)
    .map((item) => {
      const normalized = normalize(item);
      const directValue = item.toLowerCase() as WorkSetupOption["value"];

      return allowedValues.has(directValue) ? directValue : valueByLabel.get(normalized);
    })
    .filter((item): item is WorkSetupOption["value"] => item !== undefined);
}

function uniqueByLabel<T extends { readonly label: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const uniqueItems: T[] = [];

  for (const item of items) {
    const key = normalize(item.label);

    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function CandidateProfilePreferenceFieldsStyles() {
  return (
    <style>{`
      .pref-panel {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line);
        border-radius: var(--candidate-radius-surface);
        box-shadow: var(--candidate-shadow-surface);
        display: grid;
        gap: 1.25rem;
        padding: 1.25rem;
        transition: border-color var(--candidate-motion-standard);
      }

      .pref-panel:hover {
        border-color: var(--candidate-line-strong);
      }

      .pref-header {
        display: grid;
        gap: 0.25rem;
      }

      .pref-kicker {
        color: var(--candidate-muted);
        font-size: 0.7rem;
        font-weight: 850;
        letter-spacing: 0.08em;
        margin: 0;
        text-transform: uppercase;
      }

      .pref-title {
        font-size: 1.25rem;
        font-weight: 850;
        margin: 0;
        color: var(--candidate-ink);
        letter-spacing: -0.01em;
      }

      .pref-description {
        color: var(--candidate-muted);
        line-height: 1.45;
        font-size: 0.88rem;
        margin: 0;
      }

      .pref-field-block {
        display: grid;
        gap: 0.45rem;
      }

      .pref-two-column-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
        border-top: 1px solid var(--candidate-line);
        padding-top: 1rem;
      }

      .pref-label-row {
        align-items: center;
        display: flex;
        gap: 0.5rem;
        justify-content: space-between;
      }

      .pref-label-text {
        color: var(--candidate-ink);
        font-weight: 750;
        font-size: 0.88rem;
      }

      .pref-confidence-badge {
        font-size: 0.7rem;
        font-weight: 850;
        padding: 0.15rem 0.45rem;
        border-radius: 99px;
        letter-spacing: 0.02em;
      }

      .pref-confidence-high {
        background: #e6f4ea;
        color: #137333;
        border: 1px solid rgba(19, 115, 51, 0.12);
      }

      .pref-confidence-check {
        background: #fef7e0;
        color: #b06000;
        border: 1px solid rgba(176, 96, 0, 0.12);
      }

      .pref-confidence-review {
        background: #e8f0fe;
        color: #1a73e8;
        border: 1px solid rgba(26, 115, 232, 0.12);
      }

      .pref-combo-shell {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line);
        border-radius: 10px;
        display: flex;
        align-items: center;
        position: relative;
        transition: all var(--candidate-motion-standard);
      }

      .pref-combo-shell:focus-within {
        border-color: var(--candidate-ink);
        box-shadow: 0 0 0 4px rgba(17, 28, 25, 0.06);
      }

      .pref-search-input {
        background: transparent;
        border: 0;
        color: var(--candidate-ink);
        font: inherit;
        font-size: 0.88rem;
        outline: none;
        padding: 0.7rem 0.9rem;
        flex: 1;
        width: 100%;
      }

      .pref-chevron-button {
        background: transparent;
        border: 0;
        color: var(--candidate-muted);
        cursor: pointer;
        padding: 0 0.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color var(--candidate-motion-standard);
      }

      .pref-chevron-button:hover {
        color: var(--candidate-ink);
      }

      .pref-dropdown {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line-strong);
        border-radius: 10px;
        box-shadow: 0 12px 36px rgba(17, 28, 25, 0.12);
        display: grid;
        gap: 0.25rem;
        max-height: 14rem;
        overflow-y: auto;
        padding: 0.5rem;
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        z-index: 50;
      }

      .pref-dropdown-group {
        display: grid;
        gap: 0.15rem;
        margin-bottom: 0.5rem;
      }

      .pref-dropdown-group:last-child {
        margin-bottom: 0;
      }

      .pref-dropdown-group-header {
        color: var(--candidate-muted);
        font-size: 0.68rem;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.4rem 0.7rem 0.2rem;
        border-bottom: 1px solid rgba(17, 28, 25, 0.04);
      }

      .pref-option-button {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: 8px;
        color: var(--candidate-ink);
        cursor: pointer;
        display: flex;
        font: inherit;
        font-weight: 700;
        gap: 0.75rem;
        justify-content: space-between;
        padding: 0.5rem 0.7rem;
        text-align: left;
        transition: background var(--candidate-motion-standard);
        width: 100%;
      }

      .pref-option-button:hover:not(:disabled) {
        background: var(--candidate-surface-soft);
      }

      .pref-option-button:disabled {
        color: var(--candidate-muted);
        opacity: 0.45;
        cursor: default;
      }

      .pref-option-meta {
        color: var(--candidate-muted);
        font-size: 0.7rem;
        font-weight: 700;
        background: var(--candidate-surface-soft);
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        white-space: nowrap;
      }

      .pref-option-meta.recommended {
        background: #e6f4ea;
        color: #137333;
        border: 1px solid rgba(19, 115, 51, 0.12);
      }

      .pref-empty-state {
        color: var(--candidate-muted);
        font-size: 0.85rem;
        margin: 0;
        padding: 0.75rem 0.9rem;
      }

      .pref-chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }

      .pref-selected-chip {
        align-items: center;
        background: var(--candidate-ink);
        border: 0;
        border-radius: 8px;
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-size: 0.82rem;
        font-weight: 800;
        gap: 0.5rem;
        padding: 0.35rem 0.65rem;
        transition: all var(--candidate-motion-standard);
      }

      .pref-selected-chip:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .pref-selected-chip span {
        font-size: 0.75rem;
        font-weight: 900;
        opacity: 0.6;
        transition: opacity var(--candidate-motion-standard);
      }

      .pref-selected-chip:hover span {
        opacity: 1;
      }

      .pref-text-input {
        background: var(--candidate-surface-soft);
        border: 1px solid var(--candidate-line);
        border-radius: 10px;
        color: var(--candidate-ink);
        font: inherit;
        font-size: 0.88rem;
        padding: 0.7rem 0.9rem;
        width: 100%;
        transition: all var(--candidate-motion-standard);
      }

      .pref-text-input:focus {
        background: var(--candidate-surface);
        border-color: var(--candidate-ink);
        box-shadow: 0 0 0 4px rgba(17, 28, 25, 0.06);
        outline: none;
      }

      .pref-mode-grid {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .pref-mode-button {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line);
        border-radius: 10px;
        color: var(--candidate-ink);
        cursor: pointer;
        font: inherit;
        font-weight: 800;
        font-size: 0.85rem;
        padding: 0.7rem 0.5rem;
        text-align: center;
        transition: all var(--candidate-motion-standard);
      }

      .pref-mode-button:hover {
        background: var(--candidate-surface-soft);
        border-color: var(--candidate-ink-soft);
      }

      .pref-mode-button[aria-pressed="true"] {
        background: var(--candidate-ink);
        border-color: var(--candidate-ink);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(17, 28, 25, 0.12);
      }

      .pref-required-hint {
        color: var(--candidate-danger);
        font-size: 0.78rem;
        font-weight: 750;
        margin: 0.25rem 0 0;
      }
    `}</style>
  );
}
