export interface PreResumeConsentGateState {
  readonly policyScrolledToEnd: boolean;
  readonly privacyPolicyAccepted: boolean;
  readonly termsOfServiceAccepted: boolean;
}

export interface PreResumeConsentGateView {
  readonly stage: "read" | "accept" | "upload";
  readonly canProvideResume: boolean;
  readonly actionLabel: string;
  readonly statusDetail: string;
  readonly missingRequirements: readonly string[];
}

export const preResumeConsentFieldNames = {
  policyScrolledToEnd: "policy_read_to_end",
  privacyPolicyAccepted: "privacy_policy_accepted",
  termsOfServiceAccepted: "terms_of_service_accepted"
} as const;

export function buildPreResumeConsentGate(
  state: PreResumeConsentGateState
): PreResumeConsentGateView {
  const missingRequirements = [
    state.policyScrolledToEnd
      ? null
      : "Scroll to the end of the Privacy Policy and Terms of Service.",
    state.privacyPolicyAccepted ? null : "Accept the Privacy Policy.",
    state.termsOfServiceAccepted ? null : "Accept the Terms of Service."
  ].filter((requirement): requirement is string => Boolean(requirement));

  if (missingRequirements.length === 0) {
    return {
      stage: "upload",
      canProvideResume: true,
      actionLabel: "Process resume",
      statusDetail: "Privacy Policy and Terms of Service accepted. Resume upload is unlocked.",
      missingRequirements
    };
  }

  const policyReadMissing = !state.policyScrolledToEnd;

  return {
    stage: policyReadMissing ? "read" : "accept",
    canProvideResume: false,
    actionLabel: policyReadMissing
      ? "Read privacy and terms first"
      : "Accept privacy and terms",
    statusDetail: policyReadMissing
      ? "Read the policy and terms panel to the end before upload unlocks."
      : "Accept both documents before upload unlocks.",
    missingRequirements
  };
}

export function readPreResumeConsentGateFromFormData(
  formData: FormData
): PreResumeConsentGateState {
  return {
    policyScrolledToEnd: isAcceptedFormValue(
      formData.get(preResumeConsentFieldNames.policyScrolledToEnd)
    ),
    privacyPolicyAccepted: isAcceptedFormValue(
      formData.get(preResumeConsentFieldNames.privacyPolicyAccepted)
    ),
    termsOfServiceAccepted: isAcceptedFormValue(
      formData.get(preResumeConsentFieldNames.termsOfServiceAccepted)
    )
  };
}

function isAcceptedFormValue(value: FormDataEntryValue | null): boolean {
  return (
    typeof value === "string" &&
    ["1", "accepted", "on", "true"].includes(value.trim().toLowerCase())
  );
}
