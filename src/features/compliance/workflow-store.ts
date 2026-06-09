import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type {
  InterviewDisclosureAcknowledgement,
  InterviewDisclosureAuditEvent
} from "@/features/candidate-flow";
import type {
  CandidateHumanReviewAuditEvent,
  CandidateHumanReviewRequest
} from "@/features/human-review/candidate-review-request";
import type { ConsentRecord } from "@/features/privacy/consent";
import type {
  CandidateDataDeletionRequest,
  CandidateDataExportRequest,
  PrivacyAuditEvent
} from "@/features/privacy/data-rights";

export type ComplianceWorkflowAuditEvent =
  | CandidateHumanReviewAuditEvent
  | PrivacyAuditEvent
  | InterviewDisclosureAuditEvent
  | GenericComplianceWorkflowAuditEvent;

export type GenericComplianceWorkflowAuditEvent = {
  readonly audit_event_id: string;
  readonly event_type: string;
  readonly actor_type: string;
  readonly actor_id: string | null;
  readonly occurred_at: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly summary: string;
  readonly details?: Record<string, unknown>;
  readonly visibility_scope?: string;
  readonly correlation_id: string;
};

export type ComplianceWorkflowState = {
  readonly consentRecords: readonly ConsentRecord[];
  readonly humanReviewRequests: readonly CandidateHumanReviewRequest[];
  readonly dataExportRequests: readonly CandidateDataExportRequest[];
  readonly dataDeletionRequests: readonly CandidateDataDeletionRequest[];
  readonly interviewDisclosureAcknowledgements: readonly InterviewDisclosureAcknowledgement[];
  readonly auditEvents: readonly ComplianceWorkflowAuditEvent[];
};

export interface ComplianceWorkflowStore {
  appendConsentRecord(
    record: ConsentRecord,
    auditEvent: ComplianceWorkflowAuditEvent
  ): ComplianceWorkflowState;
  appendHumanReviewRequest(
    request: CandidateHumanReviewRequest,
    auditEvent: CandidateHumanReviewAuditEvent
  ): ComplianceWorkflowState;
  appendDataExportRequest(
    request: CandidateDataExportRequest,
    auditEvent: PrivacyAuditEvent
  ): ComplianceWorkflowState;
  appendDataDeletionRequest(
    request: CandidateDataDeletionRequest,
    auditEvent: PrivacyAuditEvent
  ): ComplianceWorkflowState;
  appendInterviewDisclosureAcknowledgement(
    acknowledgement: InterviewDisclosureAcknowledgement,
    auditEvent: InterviewDisclosureAuditEvent
  ): ComplianceWorkflowState;
  listCandidateWorkflowState(candidateId: string): ComplianceWorkflowState;
  listAuditEvents(): readonly ComplianceWorkflowAuditEvent[];
}

const LOCAL_COMPLIANCE_WORKFLOW_STORE_PATH = join(
  process.cwd(),
  "data-sources",
  "local",
  "compliance-workflows.json"
);

const globalComplianceWorkflowStore = globalThis as typeof globalThis & {
  __assumeraiComplianceWorkflowState?: ComplianceWorkflowState;
  __assumeraiComplianceWorkflowStore?: ComplianceWorkflowStore;
};

export function createInMemoryComplianceWorkflowStore(
  initialState: ComplianceWorkflowState = createEmptyComplianceWorkflowState()
): ComplianceWorkflowStore {
  let state = cloneState(normalizeWorkflowState(initialState));

  return {
    appendConsentRecord(record, auditEvent) {
      assertConsentRecord(record);
      assertAuditEvent(auditEvent);
      state = {
        ...state,
        consentRecords: upsertBy(
          state.consentRecords,
          record,
          (item) => item.consentRecordId
        ),
        auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
      };

      return cloneState(state);
    },
    appendHumanReviewRequest(request, auditEvent) {
      assertHumanReviewRequest(request);
      assertAuditEvent(auditEvent);
      state = {
        ...state,
        humanReviewRequests: upsertBy(
          state.humanReviewRequests,
          request,
          (item) => item.humanReviewRequestId
        ),
        auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
      };

      return cloneState(state);
    },
    appendDataExportRequest(request, auditEvent) {
      assertDataExportRequest(request);
      assertAuditEvent(auditEvent);
      state = {
        ...state,
        dataExportRequests: upsertBy(
          state.dataExportRequests,
          request,
          (item) => item.exportRequestId
        ),
        auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
      };

      return cloneState(state);
    },
    appendDataDeletionRequest(request, auditEvent) {
      assertDataDeletionRequest(request);
      assertAuditEvent(auditEvent);
      state = {
        ...state,
        dataDeletionRequests: upsertBy(
          state.dataDeletionRequests,
          request,
          (item) => item.deletionRequestId
        ),
        auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
      };

      return cloneState(state);
    },
    appendInterviewDisclosureAcknowledgement(acknowledgement, auditEvent) {
      assertInterviewDisclosureAcknowledgement(acknowledgement);
      assertAuditEvent(auditEvent);
      state = {
        ...state,
        interviewDisclosureAcknowledgements: upsertBy(
          state.interviewDisclosureAcknowledgements,
          acknowledgement,
          (item) => item.acknowledgementId
        ),
        auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
      };

      return cloneState(state);
    },
    listCandidateWorkflowState(candidateId) {
      return filterCandidateState(state, candidateId);
    },
    listAuditEvents() {
      return cloneState(state).auditEvents;
    }
  };
}

export function createFileBackedComplianceWorkflowStore(
  filePath: string = LOCAL_COMPLIANCE_WORKFLOW_STORE_PATH
): ComplianceWorkflowStore {
  return new FileBackedComplianceWorkflowStore(filePath);
}

export function getDefaultComplianceWorkflowStore(): ComplianceWorkflowStore {
  if (process.env.NODE_ENV === "test") {
    globalComplianceWorkflowStore.__assumeraiComplianceWorkflowState ??=
      createEmptyComplianceWorkflowState();
    return createInMemoryComplianceWorkflowStore(
      globalComplianceWorkflowStore.__assumeraiComplianceWorkflowState
    );
  }

  globalComplianceWorkflowStore.__assumeraiComplianceWorkflowStore ??=
    createFileBackedComplianceWorkflowStore();

  return globalComplianceWorkflowStore.__assumeraiComplianceWorkflowStore;
}

export function createEmptyComplianceWorkflowState(): ComplianceWorkflowState {
  return {
    consentRecords: [],
    humanReviewRequests: [],
    dataExportRequests: [],
    dataDeletionRequests: [],
    interviewDisclosureAcknowledgements: [],
    auditEvents: []
  };
}

class FileBackedComplianceWorkflowStore implements ComplianceWorkflowStore {
  constructor(private readonly filePath: string) {}

  appendConsentRecord(
    record: ConsentRecord,
    auditEvent: ComplianceWorkflowAuditEvent
  ): ComplianceWorkflowState {
    assertConsentRecord(record);
    assertAuditEvent(auditEvent);

    return this.update((state) => ({
      ...state,
      consentRecords: upsertBy(
        state.consentRecords,
        record,
        (item) => item.consentRecordId
      ),
      auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
    }));
  }

  appendHumanReviewRequest(
    request: CandidateHumanReviewRequest,
    auditEvent: CandidateHumanReviewAuditEvent
  ): ComplianceWorkflowState {
    assertHumanReviewRequest(request);
    assertAuditEvent(auditEvent);

    return this.update((state) => ({
      ...state,
      humanReviewRequests: upsertBy(
        state.humanReviewRequests,
        request,
        (item) => item.humanReviewRequestId
      ),
      auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
    }));
  }

  appendDataExportRequest(
    request: CandidateDataExportRequest,
    auditEvent: PrivacyAuditEvent
  ): ComplianceWorkflowState {
    assertDataExportRequest(request);
    assertAuditEvent(auditEvent);

    return this.update((state) => ({
      ...state,
      dataExportRequests: upsertBy(
        state.dataExportRequests,
        request,
        (item) => item.exportRequestId
      ),
      auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
    }));
  }

  appendDataDeletionRequest(
    request: CandidateDataDeletionRequest,
    auditEvent: PrivacyAuditEvent
  ): ComplianceWorkflowState {
    assertDataDeletionRequest(request);
    assertAuditEvent(auditEvent);

    return this.update((state) => ({
      ...state,
      dataDeletionRequests: upsertBy(
        state.dataDeletionRequests,
        request,
        (item) => item.deletionRequestId
      ),
      auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
    }));
  }

  appendInterviewDisclosureAcknowledgement(
    acknowledgement: InterviewDisclosureAcknowledgement,
    auditEvent: InterviewDisclosureAuditEvent
  ): ComplianceWorkflowState {
    assertInterviewDisclosureAcknowledgement(acknowledgement);
    assertAuditEvent(auditEvent);

    return this.update((state) => ({
      ...state,
      interviewDisclosureAcknowledgements: upsertBy(
        state.interviewDisclosureAcknowledgements,
        acknowledgement,
        (item) => item.acknowledgementId
      ),
      auditEvents: upsertBy(state.auditEvents, auditEvent, (item) => item.audit_event_id)
    }));
  }

  listCandidateWorkflowState(candidateId: string): ComplianceWorkflowState {
    return filterCandidateState(this.read(), candidateId);
  }

  listAuditEvents(): readonly ComplianceWorkflowAuditEvent[] {
    return cloneState(this.read()).auditEvents;
  }

  private update(
    reducer: (state: ComplianceWorkflowState) => ComplianceWorkflowState
  ): ComplianceWorkflowState {
    const nextState = normalizeWorkflowState(reducer(this.read()));
    this.write(nextState);

    return cloneState(nextState);
  }

  private read(): ComplianceWorkflowState {
    if (!existsSync(this.filePath)) {
      return createEmptyComplianceWorkflowState();
    }

    try {
      return normalizeWorkflowState(
        JSON.parse(readFileSync(this.filePath, "utf8")) as Partial<ComplianceWorkflowState>
      );
    } catch {
      return createEmptyComplianceWorkflowState();
    }
  }

  private write(state: ComplianceWorkflowState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }
}

function normalizeWorkflowState(
  state: Partial<ComplianceWorkflowState> | undefined
): ComplianceWorkflowState {
  return {
    consentRecords: arrayOrEmpty(state?.consentRecords),
    humanReviewRequests: arrayOrEmpty(state?.humanReviewRequests),
    dataExportRequests: arrayOrEmpty(state?.dataExportRequests),
    dataDeletionRequests: arrayOrEmpty(state?.dataDeletionRequests),
    interviewDisclosureAcknowledgements: arrayOrEmpty(
      state?.interviewDisclosureAcknowledgements
    ),
    auditEvents: arrayOrEmpty(state?.auditEvents)
  };
}

function filterCandidateState(
  state: ComplianceWorkflowState,
  candidateId: string
): ComplianceWorkflowState {
  const normalizedCandidateId = assertNonEmpty(candidateId, "candidate ID");

  return cloneState({
    consentRecords: state.consentRecords.filter(
      (record) => record.candidateId === normalizedCandidateId
    ),
    humanReviewRequests: state.humanReviewRequests.filter(
      (request) => request.candidateId === normalizedCandidateId
    ),
    dataExportRequests: state.dataExportRequests.filter(
      (request) => request.candidateId === normalizedCandidateId
    ),
    dataDeletionRequests: state.dataDeletionRequests.filter(
      (request) => request.candidateId === normalizedCandidateId
    ),
    interviewDisclosureAcknowledgements:
      state.interviewDisclosureAcknowledgements.filter(
        (acknowledgement) => acknowledgement.candidateId === normalizedCandidateId
      ),
    auditEvents: state.auditEvents.filter((event) =>
      auditEventBelongsToCandidate(event, normalizedCandidateId)
    )
  });
}

function auditEventBelongsToCandidate(
  event: ComplianceWorkflowAuditEvent,
  candidateId: string
): boolean {
  const details = event.details;

  return (
    event.target_id === candidateId ||
    event.actor_id === candidateId ||
    details?.candidate_id === candidateId
  );
}

function upsertBy<T>(
  items: readonly T[],
  item: T,
  getId: (item: T) => string
): readonly T[] {
  const id = getId(item);
  const index = items.findIndex((candidate) => getId(candidate) === id);

  if (index < 0) {
    return [...items, item];
  }

  return items.map((candidate, candidateIndex) =>
    candidateIndex === index ? item : candidate
  );
}

function arrayOrEmpty<T>(value: readonly T[] | undefined): readonly T[] {
  return Array.isArray(value) ? value : [];
}

function cloneState(state: ComplianceWorkflowState): ComplianceWorkflowState {
  return JSON.parse(JSON.stringify(state)) as ComplianceWorkflowState;
}

function assertConsentRecord(record: ConsentRecord): void {
  assertNonEmpty(record.consentRecordId, "consent record ID");
  assertNonEmpty(record.candidateId, "candidate ID");
  assertNonEmpty(record.purpose, "consent purpose");
  assertNonEmpty(record.version, "consent version");
  assertNonEmpty(record.auditEventId, "consent audit event ID");
}

function assertHumanReviewRequest(request: CandidateHumanReviewRequest): void {
  assertNonEmpty(request.humanReviewRequestId, "human review request ID");
  assertNonEmpty(request.candidateId, "candidate ID");
  assertNonEmpty(request.auditEventId, "human review audit event ID");

  if (!request.recommendationOnly) {
    throw new Error("Human review workflow must remain recommendation-only.");
  }
}

function assertDataExportRequest(request: CandidateDataExportRequest): void {
  assertNonEmpty(request.exportRequestId, "data export request ID");
  assertNonEmpty(request.candidateId, "candidate ID");
  assertNonEmpty(request.auditEventId, "data export audit event ID");
}

function assertDataDeletionRequest(request: CandidateDataDeletionRequest): void {
  assertNonEmpty(request.deletionRequestId, "data deletion request ID");
  assertNonEmpty(request.candidateId, "candidate ID");
  assertNonEmpty(request.auditEventId, "data deletion audit event ID");

  if (request.auditRetention !== "preserve_minimal_audit_record") {
    throw new Error("Deletion requests must preserve the minimal audit record.");
  }
}

function assertInterviewDisclosureAcknowledgement(
  acknowledgement: InterviewDisclosureAcknowledgement
): void {
  assertNonEmpty(acknowledgement.acknowledgementId, "acknowledgement ID");
  assertNonEmpty(acknowledgement.candidateId, "candidate ID");
  assertNonEmpty(acknowledgement.auditEventId, "acknowledgement audit event ID");
  assertNonEmpty(acknowledgement.disclosureVersion, "AI disclosure version");
}

function assertAuditEvent(event: ComplianceWorkflowAuditEvent): void {
  assertNonEmpty(event.audit_event_id, "audit event ID");
  assertNonEmpty(event.event_type, "audit event type");
  assertNonEmpty(event.occurred_at, "audit timestamp");
  assertNonEmpty(event.target_type, "audit target type");
  assertNonEmpty(event.target_id, "audit target ID");
  assertNonEmpty(event.summary, "audit summary");
  assertNonEmpty(event.correlation_id, "audit correlation ID");

  if (event.actor_id !== null) {
    assertNonEmpty(event.actor_id, "audit actor ID");
  }
}

function assertNonEmpty(value: string, label: string): string {
  if (value.trim().length === 0) {
    throw new Error(`Compliance workflow store requires ${label}.`);
  }

  return value.trim();
}
