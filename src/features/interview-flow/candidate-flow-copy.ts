import {
  resolveCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "./interview-language";

export type CandidateProgressStepId =
  | "privacy"
  | "resume"
  | "profile"
  | "interview"
  | "results"
  | "data";

export type CandidateFlowCopy = {
  readonly progress: {
    readonly ariaLabel: string;
    readonly stepStatusPrefix: string;
    readonly stepStatusConnector: string;
    readonly goBackPrefix: string;
    readonly steps: Record<CandidateProgressStepId, string>;
  };
  readonly resumeProcessing: {
    readonly progressAria: string;
    readonly reviewParsedProfile: string;
    readonly frames: readonly {
      readonly id: "received" | "extracting" | "building";
      readonly title: string;
      readonly detail: string;
    }[];
  };
  readonly profileConfirm: {
    readonly empty: {
      readonly eyebrow: string;
      readonly title: string;
      readonly body: string;
      readonly uploadResume: string;
    };
    readonly header: {
      readonly stepBadge: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly body: string;
    };
    readonly infoBannerAria: string;
    readonly parserConfidence: string;
    readonly privacyStatus: string;
    readonly errorAria: string;
    readonly requiredBadge: string;
    readonly confidenceReview: string;
    readonly csvHint: string;
    readonly contact: {
      readonly kicker: string;
      readonly title: string;
      readonly description: string;
    };
    readonly optional: {
      readonly eyebrow: string;
      readonly title: string;
      readonly description: string;
    };
    readonly submitNote: string;
    readonly submitLabel: string;
    readonly requiredFieldsMessagePrefix: string;
    readonly reviewGroups: {
      readonly contact: { readonly title: string; readonly description: string };
      readonly preferences: { readonly title: string; readonly description: string };
      readonly employmentHistory: { readonly title: string; readonly description: string };
      readonly education: { readonly title: string; readonly description: string };
      readonly topSkills: { readonly title: string; readonly description: string };
      readonly languages: { readonly title: string; readonly description: string };
    };
    readonly fieldLabels: Record<string, string>;
    readonly dynamicFieldLabels: Record<string, string>;
    readonly preferences: {
      readonly kicker: string;
      readonly title: string;
      readonly description: string;
      readonly rolePlaceholder: string;
      readonly toggleRoleChoices: string;
      readonly recommendedForYou: string;
      readonly recommended: string;
      readonly noRoleMatch: string;
      readonly addTypedRolePrefix: string;
      readonly addTypedRoleSuffix: string;
      readonly selectedTargetRoles: string;
      readonly targetRoleRequired: string;
      readonly locationPlaceholder: string;
      readonly workSetupRequired: string;
      readonly workSetupLabels: Record<"remote" | "hybrid" | "onsite", string>;
    };
  };
  readonly prepare: {
    readonly nextStep: string;
    readonly title: string;
    readonly body: string;
    readonly languageTitle: string;
    readonly languageDetail: string;
    readonly acknowledgement: string;
    readonly disclosureVersion: string;
    readonly continueToDeviceCheck: string;
    readonly backToResume: string;
    readonly modulesAria: string;
    readonly modulesTitle: string;
    readonly modules: readonly string[];
    readonly saveResumeNote: string;
    readonly safetyAria: string;
    readonly safetyTitle: string;
    readonly safetyRules: readonly string[];
  };
  readonly deviceCheck: {
    readonly title: string;
    readonly affirmations: readonly string[];
    readonly camera: {
      readonly label: string;
      readonly actionLabel: string;
      readonly readyLabel: string;
      readonly notStarted: string;
      readonly unavailable: string;
      readonly opening: string;
      readonly ready: string;
      readonly blocked: string;
      readonly previewAria: string;
      readonly previewLabel: string;
      readonly openingShort: string;
      readonly notTested: string;
    };
    readonly microphone: {
      readonly label: string;
      readonly actionLabel: string;
      readonly readyLabel: string;
      readonly notStarted: string;
      readonly unavailable: string;
      readonly listening: string;
      readonly ready: string;
      readonly blocked: string;
      readonly meterAria: string;
    };
    readonly needsTest: string;
    readonly testing: string;
    readonly startInterview: string;
    readonly ready: string;
    readonly testBoth: string;
  };
  readonly movingForward: {
    readonly decision: string;
    readonly handoff: string;
    readonly ariaLabel: string;
  };
  readonly interview: {
    readonly workspaceLabel: string;
    readonly interviewVideoAria: string;
    readonly avatarAlt: string;
    readonly sessionPaused: string;
    readonly resumeWhenReady: string;
    readonly sessionComplete: string;
    readonly answersPrivate: string;
    readonly interviewVideo: string;
    readonly answerTimeEnded: string;
    readonly microphoneOffSaveWithRetry: string;
    readonly microphoneOffSave: string;
    readonly tryAgain: string;
    readonly saveCaptured: string;
    readonly save: string;
    readonly continueInterview: string;
    readonly pauseInterview: string;
    readonly options: string;
    readonly resumeSaved: string;
    readonly startOver: string;
    readonly prepare: string;
    readonly questionAppearsPrefix: string;
    readonly questionAppearsSuffixSingular: string;
    readonly questionAppearsSuffixPlural: string;
    readonly currentQuestion: string;
    readonly hide: string;
    readonly showAll: string;
    readonly transcriptAria: string;
    readonly transcript: string;
    readonly candidatePrivate: string;
    readonly you: string;
    readonly transcribedResponse: string;
    readonly readOnly: string;
    readonly spokenResponsePlaceholder: string;
    readonly complete: string;
    readonly continueFallback: string;
    readonly startAgain: string;
    readonly confirmStartOver: string;
    readonly savedNotFound: string;
    readonly restoreFailed: string;
    readonly autosaveFailed: string;
    readonly deviceCheckFallbackMessage: string;
    readonly timedOut: string;
    readonly resumeBeforeSaving: string;
    readonly endedReviewOrRestart: string;
    readonly transcriptLimit: string;
    readonly transcriptNotReady: string;
    readonly answerCouldNotSave: string;
    readonly transitionFollowUp: {
      readonly eyebrow: string;
      readonly title: string;
      readonly detail: string;
      readonly actionLabel: string;
    };
    readonly transitionSaved: {
      readonly eyebrow: string;
      readonly title: string;
      readonly detail: string;
      readonly actionLabel: string;
    };
    readonly viewfinderYou: string;
    readonly viewfinderTimeRemaining: string;
    readonly viewfinderTimeLeft: string;
    readonly viewfinderBlocked: string;
    readonly viewfinderRetry: string;
    readonly viewfinderMuted: string;
    readonly viewfinderSessionDone: string;
    readonly viewfinderPaused: string;
    readonly viewfinderMic: string;
    readonly voice: {
      readonly initial: string;
      readonly emptySpeech: string;
      readonly answerTimeEnded: string;
      readonly answerCaptured: string;
      readonly timeUp: string;
      readonly stoppedBeforeStart: string;
      readonly disconnected: string;
      readonly unavailable: string;
      readonly starting: string;
      readonly listening: string;
      readonly saving: string;
      readonly doneSpeaking: string;
      readonly couldNotStart: string;
      readonly authModeMissing: string;
      readonly credentialMissing: string;
      readonly socketFailed: string;
    };
    readonly shell: {
      readonly autosaveReady: string;
      readonly autosaved: string;
      readonly completeStatus: string;
      readonly expired: string;
      readonly disconnected: string;
      readonly needsReview: string;
      readonly paused: string;
      readonly textFallback: string;
      readonly active: string;
      readonly completedDetail: string;
      readonly expiredDetail: string;
      readonly disconnectedDetail: string;
      readonly failedDetail: string;
      readonly pausedDetail: string;
      readonly textFallbackDetail: string;
      readonly mockDetail: string;
      readonly allQuestionsComplete: string;
      readonly interview: string;
      readonly transcriptTitle: string;
      readonly transcriptEmpty: string;
      readonly textFallbackOn: string;
      readonly voiceFirst: string;
      readonly typeFallback: string;
      readonly switchToText: string;
      readonly saveTypedAnswer: string;
      readonly answerByVoice: string;
      readonly interviewComplete: string;
      readonly interviewInProgress: string;
      readonly reviewScoreExplanation: string;
      readonly continueInterview: string;
      readonly completionDetail: string;
      readonly progressDetail: string;
    };
    readonly ux: {
      readonly interviewComplete: string;
      readonly question: string;
      readonly of: string;
      readonly allAnswersSaved: string;
      readonly startFirstQuestion: string;
      readonly answerSavedContinue: string;
      readonly continueToScores: string;
      readonly addEvidenceThenReturn: string;
      readonly answerThenMoves: string;
      readonly scoreExplanationPreview: string;
      readonly confidenceComplete: string;
      readonly humanReviewComplete: string;
      readonly consentComplete: string;
      readonly answerCanSupport: string;
      readonly confidenceFollowUp: string;
      readonly confidenceActive: string;
      readonly humanReviewActive: string;
      readonly consentActive: string;
      readonly followUpAdded: string;
    };
  };
  readonly results: {
    readonly controlsAria: string;
    readonly statusAria: string;
    readonly evidenceAria: string;
    readonly actionsAria: string;
    readonly resultActionsAria: string;
    readonly scoreExplanationAria: string;
    readonly heroTitle: string;
    readonly reviewRequested: string;
    readonly reviewStatusTitle: string;
    readonly reviewStatusOpen: string;
    readonly reviewStatusUpheld: string;
    readonly reviewStatusAdjusted: string;
    readonly reviewOutcomeReason: string;
    readonly requesting: string;
    readonly queued: string;
    readonly reviewCreateError: string;
    readonly needsReviewTitle: string;
    readonly privacyTitle: string;
    readonly needsReviewBody: string;
    readonly privacyBody: string;
  };
  readonly matches: {
    readonly stageAria: string;
    readonly boundaryAria: string;
    readonly listAria: string;
    readonly scoreAria: string;
    readonly includedAria: string;
    readonly excludedAria: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly summary: string;
    readonly boundaryTitle: string;
    readonly boundaryDetail: string;
    readonly confidence: string;
    readonly whyFit: string;
    readonly evidenceAndGaps: string;
    readonly sharingPreview: string;
    readonly sharingBody: string;
    readonly excludedNote: string;
    readonly acceptSharing: string;
    readonly declineMatch: string;
    readonly decisionRecorded: string;
    readonly statuses: Record<"accepted" | "declined" | "awaiting_candidate", string>;
  };
  readonly dataControls: {
    readonly heroAria: string;
    readonly guaranteesAria: string;
    readonly actionsAria: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly summary: string;
    readonly proofTitle: string;
    readonly proofLines: readonly string[];
    readonly reviewEyebrow: string;
    readonly reviewTitle: string;
    readonly reviewTarget: string;
    readonly targetId: string;
    readonly whatChecked: string;
    readonly optionalNotes: string;
    readonly requestHumanReview: string;
    readonly rightsEyebrow: string;
    readonly rightsTitle: string;
    readonly rightsBody: string;
    readonly requestExport: string;
    readonly requestDeletion: string;
    readonly retentionEyebrow: string;
    readonly retentionTitle: string;
    readonly requesting: string;
    readonly reviewDefaultSummary: string;
    readonly reviewFailed: string;
    readonly exportFailed: string;
    readonly deletionFailed: string;
    readonly workflowFailed: string;
    readonly defaultRawCvDeleteAfter: string;
    readonly reviewQueuedPrefix: string;
    readonly exportQueuedPrefix: string;
    readonly deletionQueuedPrefix: string;
    readonly returnToProfile: string;
    readonly targets: Record<string, string>;
    readonly retention: {
      readonly rawCv: string;
      readonly rawInterviewMedia: string;
      readonly consentAudit: string;
      readonly rawCvDetail: string;
      readonly rawMediaDetail: string;
      readonly consentAuditDetail: string;
      readonly hoursSuffix: string;
      readonly daysSuffix: string;
    };
  };
};

const en: CandidateFlowCopy = {
  progress: {
    ariaLabel: "Candidate progress",
    stepStatusPrefix: "Step",
    stepStatusConnector: "of",
    goBackPrefix: "Go back to",
    steps: {
      privacy: "Privacy",
      resume: "Resume",
      profile: "Profile",
      interview: "Interview",
      results: "Results",
      data: "Data"
    }
  },
  resumeProcessing: {
    progressAria: "Resume processing progress",
    reviewParsedProfile: "Review parsed profile",
    frames: [
      {
        id: "received",
        title: "Resume received.",
        detail:
          "Your raw CV is stored under the retention policy while the profile draft stays yours."
      },
      {
        id: "extracting",
        title: "Extracting profile evidence.",
        detail:
          "AssumerAI is reading role history, education, skills, and missing data for your review."
      },
      {
        id: "building",
        title: "Building your interview.",
        detail:
          "The next step is a profile check before any scoring or matching can use this data."
      }
    ]
  },
  profileConfirm: {
    empty: {
      eyebrow: "Candidate profile",
      title: "Profile draft unavailable",
      body: "Upload a resume again to create a fresh candidate-owned profile draft.",
      uploadResume: "Upload resume"
    },
    header: {
      stepBadge: "Step 3 of 5",
      eyebrow: "Profile review",
      title: "Confirm only what matters.",
      body:
        "Fix the key facts that shape your private result. The rest stays editable, but it should not feel like paperwork before you can move forward."
    },
    infoBannerAria: "Privacy and readiness status",
    parserConfidence: "Parser Confidence:",
    privacyStatus: "100% Private & Protected. Employer access blocked until consent.",
    errorAria: "Profile confirmation error",
    requiredBadge: "Required",
    confidenceReview: "Review",
    csvHint: "Separate entries with commas.",
    contact: {
      kicker: "Required identity",
      title: "Contact",
      description:
        "We use this to keep the profile tied to you. It is not shared with an employer unless you later accept a company-role match."
    },
    optional: {
      eyebrow: "Optional corrections",
      title: "Resume evidence",
      description:
        "Open anything that looks wrong. These fields help the interview, but they do not block you unless you want to correct them now."
    },
    submitNote:
      "Continuing opens your private result and keeps employer access blocked until you explicitly accept a company match.",
    submitLabel: "Looks right, continue",
    requiredFieldsMessagePrefix: "Complete required fields:",
    reviewGroups: {
      contact: {
        title: "Contact",
        description: "How AssumerAI identifies your profile."
      },
      preferences: {
        title: "Preferences",
        description: "The roles, locations, and work setup used to shape interview context."
      },
      employmentHistory: {
        title: "Employment history",
        description: "Every dated role detected from the resume. Section names can vary across resumes."
      },
      education: {
        title: "Education",
        description: "All education records, grades, and honors detected from the resume."
      },
      topSkills: {
        title: "Top skills",
        description: "Skills extracted as role evidence."
      },
      languages: {
        title: "Languages",
        description: "Declared language levels only; accent or native status is never scored."
      }
    },
    fieldLabels: {
      "contact.full_name": "Name",
      "contact.email": "Email",
      "contact.location": "Location",
      "preferences.target_roles": "Target roles",
      "preferences.locations": "Preferred locations",
      "preferences.work_modes": "Work setup",
      skills: "Top skills",
      languages: "Languages"
    },
    dynamicFieldLabels: {
      title: "Title",
      company: "Company",
      start_date: "Start date",
      end_date: "End date",
      responsibilities: "Responsibilities",
      measurable_impact: "Measurable impact",
      tools: "Tools",
      institution: "Institution",
      degree: "Degree",
      field: "Field",
      grades: "Grades",
      honors: "Honors",
      projects: "Projects"
    },
    preferences: {
      kicker: "Required preferences",
      title: "Preferences",
      description:
        "These choices shape the interview context. Later the catalog can be fed by the full backend role taxonomy; for the MVP this uses a small test list.",
      rolePlaceholder: "Type a role, or browse list...",
      toggleRoleChoices: "Toggle role choices",
      recommendedForYou: "Recommended for you",
      recommended: "Recommended",
      noRoleMatch: "No role in the MVP list matches that yet.",
      addTypedRolePrefix: "Add",
      addTypedRoleSuffix: "",
      selectedTargetRoles: "Selected target roles",
      targetRoleRequired: "Choose at least one target role to continue.",
      locationPlaceholder: "Milan, Remote EU",
      workSetupRequired: "Select at least one work setup.",
      workSetupLabels: {
        remote: "Remote",
        hybrid: "Hybrid",
        onsite: "On-site"
      }
    }
  },
  prepare: {
    nextStep: "Next step",
    title: "Prepare for the interview.",
    body:
      "This MVP uses a calm text interview. It is not a personality test and it is not a hidden rejection machine. Answers create evidence for human-reviewed recommendations.",
    languageTitle: "Interview language",
    languageDetail: "Questions and live transcription will use the selected language.",
    acknowledgement:
      "I understand this is an AI-assisted interview that creates evidence for human-reviewed recommendations, not an automatic hiring or rejection decision.",
    disclosureVersion: "Disclosure version:",
    continueToDeviceCheck: "Continue to device check",
    backToResume: "Back to resume",
    modulesAria: "Interview modules",
    modulesTitle: "What to expect",
    modules: [
      "Role motivation and work preferences",
      "Required language communication",
      "Domain knowledge for the role",
      "Small work sample or structured answer",
      "Client or case scenario"
    ],
    saveResumeNote: "Save and resume stays part of the interview workflow.",
    safetyAria: "Interview safety rules",
    safetyTitle: "Scoring boundaries",
    safetyRules: [
      "No face, emotion, personality, biometric, accent, or native-status scoring.",
      "Role-required language is assessed as communication evidence only.",
      "Low confidence means review needed, not candidate rejection."
    ]
  },
  deviceCheck: {
    title: "Check your camera and microphone.",
    affirmations: [
      "You can do this.",
      "We believe in you.",
      "Your setup looks ready.",
      "Take one calm breath.",
      "Go make your case."
    ],
    camera: {
      label: "Camera",
      actionLabel: "Test camera",
      readyLabel: "Camera ready",
      notStarted: "Camera preview has not started yet.",
      unavailable: "Camera testing is not available in this browser.",
      opening: "Opening camera preview...",
      ready: "Camera preview is ready.",
      blocked: "Allow camera access or close another app using the camera.",
      previewAria: "Camera preview",
      previewLabel: "Camera preview",
      openingShort: "Opening...",
      notTested: "Not tested"
    },
    microphone: {
      label: "Microphone",
      actionLabel: "Test microphone",
      readyLabel: "Microphone ready",
      notStarted: "Microphone meter has not started yet.",
      unavailable: "Microphone testing is not available in this browser.",
      listening: "Listening for microphone input...",
      ready: "Microphone is receiving sound.",
      blocked: "Allow microphone access or choose another input device.",
      meterAria: "Microphone input meter"
    },
    needsTest: "Needs test",
    testing: "Testing...",
    startInterview: "Start interview",
    ready: "Everything is ready.",
    testBoth: "Test both devices to continue."
  },
  movingForward: {
    decision: "After careful consideration, we'd like to move forward with you.",
    handoff: "Preparing your interview.",
    ariaLabel: "Moving forward"
  },
  interview: {
    workspaceLabel: "Candidate-only interview workspace",
    interviewVideoAria: "Interview video",
    avatarAlt: "AI interviewer video placeholder",
    sessionPaused: "Session paused",
    resumeWhenReady: "Resume when you are ready",
    sessionComplete: "Session complete",
    answersPrivate: "Your answers remain private until you choose sharing",
    interviewVideo: "Interview video",
    answerTimeEnded: "Answer time ended.",
    microphoneOffSaveWithRetry:
      "Microphone is off. We will save what was captured in {seconds}s unless you try again.",
    microphoneOffSave: "Microphone is off. We will save what was captured in {seconds}s.",
    tryAgain: "Try this answer again",
    saveCaptured: "Save what was captured",
    save: "Save",
    continueInterview: "Continue interview",
    pauseInterview: "Pause interview",
    options: "Interview options",
    resumeSaved: "Resume saved interview",
    startOver: "Start over",
    prepare: "Prepare",
    questionAppearsPrefix: "Question appears in",
    questionAppearsSuffixSingular: "second.",
    questionAppearsSuffixPlural: "seconds.",
    currentQuestion: "Current question",
    hide: "Hide",
    showAll: "Show all",
    transcriptAria: "Transcript and response",
    transcript: "Transcript",
    candidatePrivate: "Candidate private",
    you: "You",
    transcribedResponse: "Transcribed response",
    readOnly: "Read only",
    spokenResponsePlaceholder:
      "Your spoken response will appear here after you finish speaking.",
    complete: "Complete",
    continueFallback: "Continue",
    startAgain: "Start again",
    confirmStartOver: "Start over and clear this interview from this device?",
    savedNotFound: "No saved interview was found on this device.",
    restoreFailed: "Saved interview could not be restored.",
    autosaveFailed:
      "This browser could not save the interview locally. You can continue, but resume may not work.",
    deviceCheckFallbackMessage:
      "Could not access camera or microphone. Please check system permissions.",
    timedOut:
      "This live interview timed out. Start over when you are ready; this does not create a negative score.",
    resumeBeforeSaving: "Resume the interview before saving an answer.",
    endedReviewOrRestart: "This interview session has ended. Review the result or start a new session.",
    transcriptLimit: "This interview reached the transcript limit and needs review.",
    transcriptNotReady: "Response transcript is not ready yet.",
    answerCouldNotSave: "Answer could not be saved.",
    transitionFollowUp: {
      eyebrow: "Follow-up",
      title: "Answer saved. One short follow-up is ready.",
      detail:
        "This is for evidence clarity or confidence. Low confidence means review work, not a bad candidate.",
      actionLabel: "Open follow-up"
    },
    transitionSaved: {
      eyebrow: "Saved",
      title: "Answer saved.",
      detail: "Move on when you are ready. The next prompt stays hidden until you choose it.",
      actionLabel: "Next question"
    },
    viewfinderYou: "You (Candidate)",
    viewfinderTimeRemaining: "Response time remaining",
    viewfinderTimeLeft: "Time left",
    viewfinderBlocked: "Camera/Mic Blocked",
    viewfinderRetry: "Retry access",
    viewfinderMuted: "Camera & Mic Muted",
    viewfinderSessionDone: "Session done",
    viewfinderPaused: "Paused",
    viewfinderMic: "Mic",
    voice: {
      initial: "Microphone starts when the question appears.",
      emptySpeech: "No speech was captured. You can pause or try this question again.",
      answerTimeEnded: "Answer time ended.",
      answerCaptured: "Answer captured.",
      timeUp: "Time is up.",
      stoppedBeforeStart: "Live transcription was stopped before it started.",
      disconnected: "Live transcription disconnected. You can pause or try again.",
      unavailable: "Voice recording is not available in this browser.",
      starting: "Starting...",
      listening: "Listening.",
      saving: "Saving...",
      doneSpeaking: "I'm done speaking",
      couldNotStart: "Live transcription could not start.",
      authModeMissing: "Live transcription auth mode was not returned.",
      credentialMissing: "Live transcription credential was not returned.",
      socketFailed: "Deepgram socket failed to open."
    },
    shell: {
      autosaveReady: "Autosave ready",
      autosaved: "Autosaved",
      completeStatus: "Complete",
      expired: "Expired",
      disconnected: "Disconnected",
      needsReview: "Needs review",
      paused: "Paused",
      textFallback: "Text fallback",
      active: "Active",
      completedDetail: "Your answers are saved for candidate review before any sharing choice.",
      expiredDetail:
        "This interview session expired. Start again when you are ready; expiration has no negative score impact.",
      disconnectedDetail:
        "The live connection ended. Continue only after review or restart; the disconnect has no negative score impact.",
      failedDetail: "The interview session hit a technical issue and needs review before scoring.",
      pausedDetail: "Paused by you. Resume when you are ready to continue the same question.",
      textFallbackDetail: "Text fallback is active. Type your answer and save it when ready.",
      mockDetail: "Mock mode is active, so no external avatar vendor or paid key is required.",
      allQuestionsComplete: "All questions are complete.",
      interview: "Interview",
      transcriptTitle: "Transcript",
      transcriptEmpty: "Transcript appears here as the mock interview progresses.",
      textFallbackOn: "Text fallback on",
      voiceFirst: "Voice first",
      typeFallback: "Type the answer in the fallback box. It is saved as transcript content.",
      switchToText: "Switch to text if speaking is not comfortable or available.",
      saveTypedAnswer: "Save typed answer",
      answerByVoice: "Answer by voice",
      interviewComplete: "Interview complete",
      interviewInProgress: "Interview in progress",
      reviewScoreExplanation: "Review score explanation",
      continueInterview: "Continue interview",
      completionDetail:
        "Review explanations, confidence, missing evidence, and sharing choices before any employer access.",
      progressDetail: "Answer one question at a time. You can pause, resume, or use text fallback."
    },
    ux: {
      interviewComplete: "Interview complete",
      question: "Question",
      of: "of",
      allAnswersSaved: "All answers saved for candidate review and human-overseen scoring.",
      startFirstQuestion: "Start with the first role-relevant question.",
      answerSavedContinue: "Answer saved. Continue to the next role-relevant step.",
      continueToScores:
        "Continue to private score explanations before reviewing company sharing choices.",
      addEvidenceThenReturn:
        "Add the requested additional evidence, then the interview returns to the planned module path.",
      answerThenMoves:
        "Answer this question, then AssumerAI saves it and moves you to the next role-relevant step.",
      scoreExplanationPreview: "Score explanation preview",
      confidenceComplete:
        "Confidence is shown separately from score quality so thin evidence creates review work, not an automatic negative outcome.",
      humanReviewComplete:
        "Human reviewers inspect evidence, confidence, missing data, and role calibration before any employer action.",
      consentComplete:
        "You review the score explanation and each company match before any employer can see interview evidence.",
      answerCanSupport: "What this answer can support",
      confidenceFollowUp:
        "This follow-up increases score confidence. Low confidence means review needed, not a negative score.",
      confidenceActive:
        "Clear, specific evidence raises confidence; missing details create review notes, not automatic rejection.",
      humanReviewActive: "Scores remain recommendations with evidence for human review, not automated hiring decisions.",
      consentActive:
        "Employers cannot see this interview, transcript, or score explanation until you accept a company match.",
      followUpAdded: "Follow-up added."
    }
  },
  results: {
    controlsAria: "Candidate result controls",
    statusAria: "Result status",
    evidenceAria: "Evidence summary",
    actionsAria: "Candidate actions",
    resultActionsAria: "Candidate result actions",
    scoreExplanationAria: "Score explanation",
    heroTitle: "This is still human-reviewed and candidate-controlled.",
    reviewRequested: "Review requested",
    reviewStatusTitle: "Your human review requests",
    reviewStatusOpen: "Awaiting human review",
    reviewStatusUpheld: "Reviewed: original evaluation upheld",
    reviewStatusAdjusted: "Reviewed: adjusted with documented reason",
    reviewOutcomeReason: "Reviewer reason",
    requesting: "Requesting...",
    queued: "Queued",
    reviewCreateError: "Human review request could not be created.",
    needsReviewTitle: "What still needs review",
    privacyTitle: "Candidate privacy safeguards",
    needsReviewBody:
      "Missing evidence raises confidence and review questions. It is not a candidate rejection signal.",
    privacyBody:
      "These rules keep the result candidate-private until you choose a specific match to share."
  },
  matches: {
    stageAria: "Candidate match decisions",
    boundaryAria: "Sharing boundary",
    listAria: "Available matches",
    scoreAria: "Match score and confidence",
    includedAria: "Included data categories",
    excludedAria: "Excluded data categories",
    eyebrow: "Private match review",
    title: "Candidate-controlled matches",
    summary:
      "Employer cannot see your profile, scorecard, transcript, or match explanation unless you accept sharing for that exact company and role.",
    boundaryTitle: "Employer cannot see",
    boundaryDetail: "0 active shares until you accept one match.",
    confidence: "confidence",
    whyFit: "Why it may fit",
    evidenceAndGaps: "Evidence and gaps",
    sharingPreview: "Scoped sharing preview",
    sharingBody:
      "Accepting creates a consent record for only this company and role. Human review is still required before employer-side decisions.",
    excludedNote: "Raw CV and raw interview media stay excluded.",
    acceptSharing: "Accept sharing",
    declineMatch: "Decline match",
    decisionRecorded: "Decision recorded:",
    statuses: {
      accepted: "Sharing accepted",
      declined: "Match declined",
      awaiting_candidate: "Awaiting your decision"
    }
  },
  dataControls: {
    heroAria: "Data controls",
    guaranteesAria: "Privacy guarantees",
    actionsAria: "Candidate data actions",
    eyebrow: "Candidate controls",
    title: "Your data, review, and retention.",
    summary:
      "A small control room for the things that should never be hidden: human review, export, deletion, and retention timing.",
    proofTitle: "No automatic rejection.",
    proofLines: [
      "Requests create audit IDs and stay candidate-visible.",
      "Employer sharing remains match-specific and consent-gated."
    ],
    reviewEyebrow: "Human review",
    reviewTitle: "Ask a person to review an outcome.",
    reviewTarget: "Review target",
    targetId: "Target ID",
    whatChecked: "What should be checked?",
    optionalNotes: "Optional evidence notes",
    requestHumanReview: "Request human review",
    rightsEyebrow: "Data rights",
    rightsTitle: "Export or delete your candidate data.",
    rightsBody:
      "Export includes profile, raw CV, scorecards, interview transcript, match explanations, consent records, and audit metadata. Deletion preserves only the minimal audit record needed to prove the request.",
    requestExport: "Request export",
    requestDeletion: "Request deletion",
    retentionEyebrow: "Retention",
    retentionTitle: "Auto-delete timing is visible here.",
    requesting: "Requesting...",
    reviewDefaultSummary:
      "Please have a human reviewer check this before it is used for next steps.",
    reviewFailed: "Human review request failed.",
    exportFailed: "Data export request failed.",
    deletionFailed: "Data deletion request failed.",
    workflowFailed: "Candidate data workflow request failed.",
    defaultRawCvDeleteAfter: "30 days after upload",
    reviewQueuedPrefix: "Queued with audit event",
    exportQueuedPrefix: "Export queued:",
    deletionQueuedPrefix: "Deletion queued:",
    returnToProfile: "Return to user profile",
    targets: {
      resume_scorecard: "Resume scorecard",
      interview_scorecard: "Interview scorecard",
      company_match: "Company match",
      candidate_profile: "Candidate profile",
      data_access: "Data access or sharing"
    },
    retention: {
      rawCv: "Raw CV",
      rawInterviewMedia: "Raw interview media",
      consentAudit: "Consent and audit records",
      rawCvDetail: "Auto-delete after profile extraction unless a legal hold applies.",
      rawMediaDetail: "Integrity-only media is deleted after transcription and scoring.",
      consentAuditDetail: "Minimal audit evidence is retained for rights, review, and disputes.",
      hoursSuffix: "hours",
      daysSuffix: "days"
    }
  }
};

const it: CandidateFlowCopy = {
  ...en,
  progress: {
    ariaLabel: "Avanzamento candidato",
    stepStatusPrefix: "Passo",
    stepStatusConnector: "di",
    goBackPrefix: "Torna a",
    steps: {
      privacy: "Privacy",
      resume: "CV",
      profile: "Profilo",
      interview: "Colloquio",
      results: "Risultati",
      data: "Dati"
    }
  },
  resumeProcessing: {
    progressAria: "Avanzamento elaborazione CV",
    reviewParsedProfile: "Rivedi profilo estratto",
    frames: [
      {
        id: "received",
        title: "CV ricevuto.",
        detail:
          "Il CV grezzo resta sotto la politica di conservazione mentre la bozza profilo resta tua."
      },
      {
        id: "extracting",
        title: "Estrazione evidenze profilo.",
        detail:
          "AssumerAI legge esperienze, istruzione, competenze e dati mancanti per la tua revisione."
      },
      {
        id: "building",
        title: "Preparazione colloquio.",
        detail:
          "Il prossimo passo e' un controllo profilo prima che punteggio o matching possano usare questi dati."
      }
    ]
  },
  profileConfirm: {
    ...en.profileConfirm,
    empty: {
      eyebrow: "Profilo candidato",
      title: "Bozza profilo non disponibile",
      body: "Carica di nuovo un CV per creare una nuova bozza profilo controllata da te.",
      uploadResume: "Carica CV"
    },
    header: {
      stepBadge: "Passo 3 di 5",
      eyebrow: "Revisione profilo",
      title: "Conferma solo cio che conta.",
      body:
        "Correggi i fatti chiave che definiscono il tuo risultato privato. Il resto resta modificabile, ma non deve sembrare burocrazia prima di avanzare."
    },
    infoBannerAria: "Stato privacy e preparazione",
    parserConfidence: "Confidenza parser:",
    privacyStatus: "100% privato e protetto. Accesso datore bloccato fino al consenso.",
    errorAria: "Errore conferma profilo",
    requiredBadge: "Obbligatorio",
    confidenceReview: "Rivedi",
    csvHint: "Separa le voci con virgole.",
    contact: {
      kicker: "Identita obbligatoria",
      title: "Contatto",
      description:
        "Lo usiamo per tenere il profilo collegato a te. Non viene condiviso con un datore finche non accetti un match azienda-ruolo."
    },
    optional: {
      eyebrow: "Correzioni opzionali",
      title: "Evidenze dal CV",
      description:
        "Apri cio che sembra errato. Questi campi aiutano il colloquio, ma non ti bloccano salvo tu voglia correggerli ora."
    },
    submitNote:
      "Continuando apri il tuo risultato privato e l'accesso dei datori resta bloccato finche accetti esplicitamente un match.",
    submitLabel: "Sembra corretto, continua",
    requiredFieldsMessagePrefix: "Completa i campi obbligatori:",
    reviewGroups: {
      contact: {
        title: "Contatto",
        description: "Come AssumerAI identifica il tuo profilo."
      },
      preferences: {
        title: "Preferenze",
        description: "Ruoli, sedi e modalita di lavoro usati per definire il contesto del colloquio."
      },
      employmentHistory: {
        title: "Esperienze lavorative",
        description: "Ogni ruolo con date rilevato dal CV. I nomi sezione possono variare."
      },
      education: {
        title: "Istruzione",
        description: "Percorsi di studio, voti e riconoscimenti rilevati dal CV."
      },
      topSkills: {
        title: "Competenze principali",
        description: "Competenze estratte come evidenza di ruolo."
      },
      languages: {
        title: "Lingue",
        description: "Solo livelli dichiarati; accento o madrelingua non sono mai valutati."
      }
    },
    fieldLabels: {
      "contact.full_name": "Nome",
      "contact.email": "Email",
      "contact.location": "Luogo",
      "preferences.target_roles": "Ruoli target",
      "preferences.locations": "Sedi preferite",
      "preferences.work_modes": "Modalita di lavoro",
      skills: "Competenze principali",
      languages: "Lingue"
    },
    dynamicFieldLabels: {
      title: "Ruolo",
      company: "Azienda",
      start_date: "Data inizio",
      end_date: "Data fine",
      responsibilities: "Responsabilita",
      measurable_impact: "Impatto misurabile",
      tools: "Strumenti",
      institution: "Istituzione",
      degree: "Titolo",
      field: "Area",
      grades: "Voti",
      honors: "Riconoscimenti",
      projects: "Progetti"
    },
    preferences: {
      kicker: "Preferenze obbligatorie",
      title: "Preferenze",
      description:
        "Queste scelte definiscono il contesto del colloquio. Piu avanti il catalogo potra usare la tassonomia completa dei ruoli; per l'MVP usa una lista di prova.",
      rolePlaceholder: "Scrivi un ruolo o sfoglia la lista...",
      toggleRoleChoices: "Mostra o nascondi ruoli",
      recommendedForYou: "Consigliati per te",
      recommended: "Consigliato",
      noRoleMatch: "Nessun ruolo nella lista MVP corrisponde ancora.",
      addTypedRolePrefix: "Aggiungi",
      addTypedRoleSuffix: "",
      selectedTargetRoles: "Ruoli target selezionati",
      targetRoleRequired: "Scegli almeno un ruolo target per continuare.",
      locationPlaceholder: "Milano, remoto UE",
      workSetupRequired: "Seleziona almeno una modalita di lavoro.",
      workSetupLabels: {
        remote: "Remoto",
        hybrid: "Ibrido",
        onsite: "In sede"
      }
    }
  },
  prepare: {
    nextStep: "Prossimo passo",
    title: "Preparati al colloquio.",
    body:
      "Questo MVP usa un colloquio testuale calmo. Non e' un test di personalita e non e' una macchina nascosta di rifiuto. Le risposte creano evidenze per raccomandazioni revisionate da persone.",
    languageTitle: "Lingua del colloquio",
    languageDetail: "Domande e trascrizione live useranno la lingua selezionata.",
    acknowledgement:
      "Capisco che questo e' un colloquio assistito da AI che crea evidenze per raccomandazioni revisionate da persone, non una decisione automatica di assunzione o rifiuto.",
    disclosureVersion: "Versione informativa:",
    continueToDeviceCheck: "Continua al controllo dispositivi",
    backToResume: "Torna al CV",
    modulesAria: "Moduli colloquio",
    modulesTitle: "Cosa aspettarti",
    modules: [
      "Motivazione per il ruolo e preferenze di lavoro",
      "Comunicazione richiesta per la lingua",
      "Conoscenza del dominio del ruolo",
      "Piccolo esempio di lavoro o risposta strutturata",
      "Scenario cliente o caso"
    ],
    saveResumeNote: "Salvataggio e ripresa restano parte del flusso colloquio.",
    safetyAria: "Regole di sicurezza del colloquio",
    safetyTitle: "Confini del punteggio",
    safetyRules: [
      "Nessun punteggio su volto, emozioni, personalita, biometria, accento o madrelingua.",
      "La lingua richiesta dal ruolo e' valutata solo come evidenza comunicativa.",
      "Bassa confidenza significa revisione necessaria, non rifiuto del candidato."
    ]
  },
  deviceCheck: {
    title: "Controlla camera e microfono.",
    affirmations: [
      "Puoi farcela.",
      "Crediamo in te.",
      "La configurazione sembra pronta.",
      "Fai un respiro calmo.",
      "Mostra il tuo valore."
    ],
    camera: {
      label: "Camera",
      actionLabel: "Testa camera",
      readyLabel: "Camera pronta",
      notStarted: "L'anteprima camera non e' ancora partita.",
      unavailable: "Il test camera non e' disponibile in questo browser.",
      opening: "Apertura anteprima camera...",
      ready: "Anteprima camera pronta.",
      blocked: "Consenti accesso alla camera o chiudi un'altra app che la usa.",
      previewAria: "Anteprima camera",
      previewLabel: "Anteprima camera",
      openingShort: "Apertura...",
      notTested: "Non testata"
    },
    microphone: {
      label: "Microfono",
      actionLabel: "Testa microfono",
      readyLabel: "Microfono pronto",
      notStarted: "Il misuratore microfono non e' ancora partito.",
      unavailable: "Il test microfono non e' disponibile in questo browser.",
      listening: "Ascolto input microfono...",
      ready: "Il microfono sta ricevendo suono.",
      blocked: "Consenti accesso al microfono o scegli un altro input.",
      meterAria: "Misuratore input microfono"
    },
    needsTest: "Da testare",
    testing: "Test in corso...",
    startInterview: "Avvia colloquio",
    ready: "Tutti gli elementi sono pronti.",
    testBoth: "Testa entrambi i dispositivi per continuare."
  },
  movingForward: {
    decision: "Dopo attenta valutazione, vogliamo proseguire con te.",
    handoff: "Preparazione del tuo colloquio.",
    ariaLabel: "Avanzamento"
  },
  interview: {
    ...en.interview,
    workspaceLabel: "Spazio colloquio solo candidato",
    interviewVideoAria: "Video colloquio",
    avatarAlt: "Segnaposto video intervistatore AI",
    sessionPaused: "Sessione in pausa",
    resumeWhenReady: "Riprendi quando sei pronto",
    sessionComplete: "Sessione completata",
    answersPrivate: "Le tue risposte restano private finche scegli la condivisione",
    interviewVideo: "Video colloquio",
    answerTimeEnded: "Tempo risposta terminato.",
    microphoneOffSaveWithRetry:
      "Microfono spento. Salveremo quanto acquisito tra {seconds}s salvo tu riprovi.",
    microphoneOffSave: "Microfono spento. Salveremo quanto acquisito tra {seconds}s.",
    tryAgain: "Riprova questa risposta",
    saveCaptured: "Salva quanto acquisito",
    save: "Salva",
    continueInterview: "Continua colloquio",
    pauseInterview: "Metti in pausa",
    options: "Opzioni colloquio",
    resumeSaved: "Riprendi colloquio salvato",
    startOver: "Ricomincia",
    prepare: "Preparati",
    questionAppearsPrefix: "La domanda appare tra",
    questionAppearsSuffixSingular: "secondo.",
    questionAppearsSuffixPlural: "secondi.",
    currentQuestion: "Domanda attuale",
    hide: "Nascondi",
    showAll: "Mostra tutto",
    transcriptAria: "Trascrizione e risposta",
    transcript: "Trascrizione",
    candidatePrivate: "Privato candidato",
    you: "Tu",
    transcribedResponse: "Risposta trascritta",
    readOnly: "Sola lettura",
    spokenResponsePlaceholder:
      "La tua risposta parlata apparira qui dopo che avrai finito di parlare.",
    complete: "Completato",
    continueFallback: "Continua",
    startAgain: "Ricomincia",
    confirmStartOver: "Ricominciare e cancellare questo colloquio dal dispositivo?",
    savedNotFound: "Nessun colloquio salvato trovato su questo dispositivo.",
    restoreFailed: "Impossibile ripristinare il colloquio salvato.",
    autosaveFailed:
      "Questo browser non ha potuto salvare localmente il colloquio. Puoi continuare, ma la ripresa potrebbe non funzionare.",
    deviceCheckFallbackMessage:
      "Impossibile accedere a camera o microfono. Controlla i permessi di sistema.",
    timedOut:
      "Questo colloquio live e' scaduto. Ricomincia quando sei pronto; non crea un punteggio negativo.",
    resumeBeforeSaving: "Riprendi il colloquio prima di salvare una risposta.",
    endedReviewOrRestart: "Questa sessione colloquio e' terminata. Rivedi il risultato o avvia una nuova sessione.",
    transcriptLimit: "Questo colloquio ha raggiunto il limite di trascrizione e richiede revisione.",
    transcriptNotReady: "La trascrizione della risposta non e' ancora pronta.",
    answerCouldNotSave: "Impossibile salvare la risposta.",
    transitionFollowUp: {
      eyebrow: "Follow-up",
      title: "Risposta salvata. E' pronto un breve follow-up.",
      detail:
        "Serve per chiarire evidenza o confidenza. Bassa confidenza significa lavoro di revisione, non candidato scarso.",
      actionLabel: "Apri follow-up"
    },
    transitionSaved: {
      eyebrow: "Salvato",
      title: "Risposta salvata.",
      detail: "Avanza quando sei pronto. Il prossimo prompt resta nascosto finche lo scegli.",
      actionLabel: "Domanda successiva"
    },
    viewfinderYou: "Tu (candidato)",
    viewfinderTimeRemaining: "Tempo risposta rimanente",
    viewfinderTimeLeft: "Tempo restante",
    viewfinderBlocked: "Camera/microfono bloccati",
    viewfinderRetry: "Riprova accesso",
    viewfinderMuted: "Camera e microfono disattivati",
    viewfinderSessionDone: "Sessione conclusa",
    viewfinderPaused: "In pausa",
    viewfinderMic: "Mic",
    voice: {
      initial: "Il microfono parte quando appare la domanda.",
      emptySpeech: "Non e' stata acquisita voce. Puoi mettere in pausa o riprovare la domanda.",
      answerTimeEnded: "Tempo risposta terminato.",
      answerCaptured: "Risposta acquisita.",
      timeUp: "Tempo scaduto.",
      stoppedBeforeStart: "La trascrizione live e' stata fermata prima dell'avvio.",
      disconnected: "Trascrizione live disconnessa. Puoi mettere in pausa o riprovare.",
      unavailable: "La registrazione vocale non e' disponibile in questo browser.",
      starting: "Avvio...",
      listening: "Ascolto.",
      saving: "Salvataggio...",
      doneSpeaking: "Ho finito di parlare",
      couldNotStart: "Impossibile avviare la trascrizione live.",
      authModeMissing: "La modalita auth della trascrizione live non e' stata restituita.",
      credentialMissing: "La credenziale della trascrizione live non e' stata restituita.",
      socketFailed: "Impossibile aprire il socket Deepgram."
    },
    shell: {
      ...en.interview.shell,
      autosaveReady: "Autosave pronto",
      autosaved: "Autosalvato",
      completeStatus: "Completato",
      expired: "Scaduto",
      disconnected: "Disconnesso",
      needsReview: "Richiede revisione",
      paused: "In pausa",
      textFallback: "Fallback testuale",
      active: "Attivo",
      completedDetail: "Le tue risposte sono salvate per la tua revisione prima di ogni condivisione.",
      expiredDetail:
        "La sessione colloquio e' scaduta. Ricomincia quando sei pronto; la scadenza non ha impatto negativo.",
      disconnectedDetail:
        "La connessione live e' terminata. Continua solo dopo revisione o riavvio; la disconnessione non ha impatto negativo.",
      failedDetail: "La sessione ha avuto un problema tecnico e richiede revisione prima del punteggio.",
      pausedDetail: "Pausa scelta da te. Riprendi quando sei pronto a continuare la stessa domanda.",
      textFallbackDetail: "Fallback testuale attivo. Scrivi la risposta e salvala quando pronta.",
      mockDetail: "Modalita mock attiva, quindi non serve vendor avatar esterno o chiave pagata.",
      allQuestionsComplete: "Tutte le domande sono complete.",
      interview: "Colloquio",
      transcriptTitle: "Trascrizione",
      transcriptEmpty: "La trascrizione appare qui mentre procede il colloquio mock.",
      textFallbackOn: "Fallback testuale attivo",
      voiceFirst: "Prima voce",
      typeFallback: "Scrivi la risposta nel box fallback. Viene salvata come contenuto trascritto.",
      switchToText: "Passa al testo se parlare non e' comodo o disponibile.",
      saveTypedAnswer: "Salva risposta scritta",
      answerByVoice: "Rispondi a voce",
      interviewComplete: "Colloquio completato",
      interviewInProgress: "Colloquio in corso",
      reviewScoreExplanation: "Rivedi spiegazione punteggio",
      continueInterview: "Continua colloquio",
      completionDetail:
        "Rivedi spiegazioni, confidenza, evidenze mancanti e scelte di condivisione prima di ogni accesso datore.",
      progressDetail: "Rispondi a una domanda alla volta. Puoi mettere in pausa, riprendere o usare testo."
    },
    ux: {
      ...en.interview.ux,
      interviewComplete: "Colloquio completato",
      question: "Domanda",
      of: "di",
      allAnswersSaved: "Tutte le risposte sono salvate per revisione candidato e punteggio con supervisione umana.",
      startFirstQuestion: "Inizia con la prima domanda rilevante per il ruolo.",
      answerSavedContinue: "Risposta salvata. Continua al prossimo passo rilevante per il ruolo.",
      continueToScores:
        "Continua alle spiegazioni private del punteggio prima di rivedere le scelte di condivisione azienda.",
      addEvidenceThenReturn:
        "Aggiungi l'evidenza richiesta, poi il colloquio torna al percorso modulo previsto.",
      answerThenMoves:
        "Rispondi a questa domanda, poi AssumerAI la salva e passa al prossimo passo rilevante.",
      scoreExplanationPreview: "Anteprima spiegazione punteggio",
      confidenceComplete:
        "La confidenza e' mostrata separatamente dalla qualita del punteggio: evidenza debole crea revisione, non esito negativo automatico.",
      humanReviewComplete:
        "Reviewer umani controllano evidenza, confidenza, dati mancanti e calibrazione ruolo prima di ogni azione datore.",
      consentComplete:
        "Rivedi spiegazione punteggio e ogni match azienda prima che un datore possa vedere evidenze del colloquio.",
      answerCanSupport: "Cosa puo supportare questa risposta",
      confidenceFollowUp:
        "Questo follow-up aumenta la confidenza. Bassa confidenza significa revisione, non punteggio negativo.",
      confidenceActive:
        "Evidenze chiare e specifiche aumentano la confidenza; dettagli mancanti creano note di revisione, non rifiuto automatico.",
      humanReviewActive: "I punteggi restano raccomandazioni con evidenza per revisione umana, non decisioni automatizzate.",
      consentActive:
        "I datori non possono vedere colloquio, trascrizione o spiegazione punteggio finche accetti un match.",
      followUpAdded: "Follow-up aggiunto."
    }
  },
  results: {
    ...en.results,
    controlsAria: "Controlli risultato candidato",
    statusAria: "Stato risultato",
    evidenceAria: "Sintesi evidenze",
    actionsAria: "Azioni candidato",
    resultActionsAria: "Azioni risultato candidato",
    scoreExplanationAria: "Spiegazione punteggio",
    heroTitle: "Resta revisionato da persone e controllato dal candidato.",
    reviewRequested: "Revisione richiesta",
    reviewStatusTitle: "Le tue richieste di revisione umana",
    reviewStatusOpen: "In attesa di revisione umana",
    reviewStatusUpheld: "Rivisto: valutazione originale confermata",
    reviewStatusAdjusted: "Rivisto: rettificata con motivazione documentata",
    reviewOutcomeReason: "Motivazione del reviewer",
    requesting: "Richiesta in corso...",
    queued: "In coda",
    reviewCreateError: "Impossibile creare la richiesta di revisione umana.",
    needsReviewTitle: "Cosa richiede ancora revisione",
    privacyTitle: "Tutele privacy candidato",
    needsReviewBody:
      "Le evidenze mancanti aumentano domande di confidenza e revisione. Non sono un segnale di rifiuto candidato.",
    privacyBody:
      "Queste regole tengono il risultato privato finche scegli un match specifico da condividere."
  },
  matches: {
    ...en.matches,
    stageAria: "Decisioni match candidato",
    boundaryAria: "Confine condivisione",
    listAria: "Match disponibili",
    scoreAria: "Punteggio match e confidenza",
    includedAria: "Categorie dati incluse",
    excludedAria: "Categorie dati escluse",
    eyebrow: "Revisione match privata",
    title: "Match controllati dal candidato",
    summary:
      "Il datore non vede profilo, scorecard, trascrizione o spiegazione match salvo tu accetti la condivisione per quella azienda e quel ruolo.",
    boundaryTitle: "Il datore non puo vedere",
    boundaryDetail: "0 condivisioni attive finche non accetti un match.",
    confidence: "confidenza",
    whyFit: "Perche puo essere adatto",
    evidenceAndGaps: "Evidenze e gap",
    sharingPreview: "Anteprima condivisione limitata",
    sharingBody:
      "Accettare crea un consenso solo per questa azienda e questo ruolo. La revisione umana resta richiesta prima di decisioni lato datore.",
    excludedNote: "CV grezzo e media grezzi del colloquio restano esclusi.",
    acceptSharing: "Accetta condivisione",
    declineMatch: "Rifiuta match",
    decisionRecorded: "Decisione registrata:",
    statuses: {
      accepted: "Condivisione accettata",
      declined: "Match rifiutato",
      awaiting_candidate: "In attesa della tua decisione"
    }
  },
  dataControls: {
    ...en.dataControls,
    heroAria: "Controlli dati",
    guaranteesAria: "Garanzie privacy",
    actionsAria: "Azioni dati candidato",
    eyebrow: "Controlli candidato",
    title: "I tuoi dati, revisione e conservazione.",
    summary:
      "Una piccola sala controllo per cio che non deve mai essere nascosto: revisione umana, export, cancellazione e tempi di conservazione.",
    proofTitle: "Nessun rifiuto automatico.",
    proofLines: [
      "Le richieste creano ID audit e restano visibili al candidato.",
      "La condivisione datore resta specifica per match e basata sul consenso."
    ],
    reviewEyebrow: "Revisione umana",
    reviewTitle: "Chiedi a una persona di rivedere un risultato.",
    reviewTarget: "Oggetto revisione",
    targetId: "ID oggetto",
    whatChecked: "Cosa deve essere controllato?",
    optionalNotes: "Note evidenza opzionali",
    requestHumanReview: "Richiedi revisione umana",
    rightsEyebrow: "Diritti sui dati",
    rightsTitle: "Esporta o elimina i tuoi dati candidato.",
    rightsBody:
      "L'export include profilo, CV grezzo, scorecard, trascrizione colloquio, spiegazioni match, consensi e metadati audit. La cancellazione conserva solo il minimo record audit necessario a provare la richiesta.",
    requestExport: "Richiedi export",
    requestDeletion: "Richiedi cancellazione",
    retentionEyebrow: "Conservazione",
    retentionTitle: "I tempi di auto-cancellazione sono visibili qui.",
    requesting: "Richiesta in corso...",
    reviewDefaultSummary:
      "Per favore fai controllare questo da un reviewer umano prima che sia usato nei prossimi passi.",
    reviewFailed: "Richiesta revisione umana fallita.",
    exportFailed: "Richiesta export dati fallita.",
    deletionFailed: "Richiesta cancellazione dati fallita.",
    workflowFailed: "Richiesta workflow dati candidato fallita.",
    defaultRawCvDeleteAfter: "30 giorni dopo il caricamento",
    reviewQueuedPrefix: "In coda con evento audit",
    exportQueuedPrefix: "Export in coda:",
    deletionQueuedPrefix: "Cancellazione in coda:",
    returnToProfile: "Torna al profilo utente",
    targets: {
      resume_scorecard: "Scorecard CV",
      interview_scorecard: "Scorecard colloquio",
      company_match: "Match azienda",
      candidate_profile: "Profilo candidato",
      data_access: "Accesso dati o condivisione"
    },
    retention: {
      rawCv: "CV grezzo",
      rawInterviewMedia: "Media grezzi colloquio",
      consentAudit: "Record consenso e audit",
      rawCvDetail: "Auto-cancellazione dopo estrazione profilo salvo blocco legale.",
      rawMediaDetail: "I media solo-integrita sono eliminati dopo trascrizione e scoring.",
      consentAuditDetail: "Evidenza audit minima conservata per diritti, revisione e contestazioni.",
      hoursSuffix: "ore",
      daysSuffix: "giorni"
    }
  }
};

const fr: CandidateFlowCopy = {
  ...en,
  progress: {
    ariaLabel: "Progression candidat",
    stepStatusPrefix: "Etape",
    stepStatusConnector: "sur",
    goBackPrefix: "Revenir a",
    steps: {
      privacy: "Confidentialite",
      resume: "CV",
      profile: "Profil",
      interview: "Entretien",
      results: "Resultats",
      data: "Donnees"
    }
  },
  resumeProcessing: {
    progressAria: "Progression du traitement du CV",
    reviewParsedProfile: "Verifier le profil extrait",
    frames: [
      {
        id: "received",
        title: "CV recu.",
        detail:
          "Votre CV brut est conserve selon la politique de retention pendant que le brouillon de profil reste a vous."
      },
      {
        id: "extracting",
        title: "Extraction des preuves profil.",
        detail:
          "AssumerAI lit experiences, formation, competences et donnees manquantes pour votre verification."
      },
      {
        id: "building",
        title: "Preparation de votre entretien.",
        detail:
          "La prochaine etape est une verification du profil avant tout score ou matching."
      }
    ]
  },
  profileConfirm: {
    ...en.profileConfirm,
    empty: {
      eyebrow: "Profil candidat",
      title: "Brouillon de profil indisponible",
      body: "Importez a nouveau un CV pour creer un nouveau brouillon de profil controle par vous.",
      uploadResume: "Importer CV"
    },
    header: {
      stepBadge: "Etape 3 sur 5",
      eyebrow: "Verification du profil",
      title: "Controlez seulement ce qui compte.",
      body:
        "Corrigez les faits cles qui structurent votre resultat prive. Le reste reste modifiable, sans devenir de la paperasse avant d'avancer."
    },
    infoBannerAria: "Statut confidentialite et preparation",
    parserConfidence: "Confiance du parseur:",
    privacyStatus: "100% prive et protege. Acces employeur bloque jusqu'au consentement.",
    errorAria: "Erreur de confirmation profil",
    requiredBadge: "Obligatoire",
    confidenceReview: "Verifier",
    csvHint: "Separez les entrees par des virgules.",
    contact: {
      kicker: "Identite obligatoire",
      title: "Contact",
      description:
        "Nous l'utilisons pour rattacher le profil a vous. Il n'est pas partage avec un employeur sauf si vous acceptez plus tard un match entreprise-role."
    },
    optional: {
      eyebrow: "Corrections optionnelles",
      title: "Preuves du CV",
      description:
        "Ouvrez ce qui semble incorrect. Ces champs aident l'entretien, mais ne vous bloquent pas sauf si vous voulez les corriger maintenant."
    },
    submitNote:
      "Continuer ouvre votre resultat prive et garde l'acces employeur bloque jusqu'a acceptation explicite d'un match.",
    submitLabel: "C'est correct, continuer",
    requiredFieldsMessagePrefix: "Completez les champs obligatoires:",
    reviewGroups: {
      contact: {
        title: "Contact",
        description: "Comment AssumerAI identifie votre profil."
      },
      preferences: {
        title: "Preferences",
        description: "Roles, lieux et mode de travail utilises pour le contexte d'entretien."
      },
      employmentHistory: {
        title: "Experience professionnelle",
        description: "Chaque role date detecte dans le CV. Les noms de sections peuvent varier."
      },
      education: {
        title: "Formation",
        description: "Toutes les formations, notes et distinctions detectees dans le CV."
      },
      topSkills: {
        title: "Competences principales",
        description: "Competences extraites comme preuves de role."
      },
      languages: {
        title: "Langues",
        description: "Niveaux declares uniquement; accent ou langue maternelle ne sont jamais scores."
      }
    },
    fieldLabels: {
      "contact.full_name": "Nom",
      "contact.email": "Email",
      "contact.location": "Lieu",
      "preferences.target_roles": "Roles cibles",
      "preferences.locations": "Lieux preferes",
      "preferences.work_modes": "Mode de travail",
      skills: "Competences principales",
      languages: "Langues"
    },
    dynamicFieldLabels: {
      title: "Poste",
      company: "Entreprise",
      start_date: "Date de debut",
      end_date: "Date de fin",
      responsibilities: "Responsabilites",
      measurable_impact: "Impact mesurable",
      tools: "Outils",
      institution: "Etablissement",
      degree: "Diplome",
      field: "Domaine",
      grades: "Notes",
      honors: "Distinctions",
      projects: "Projets"
    },
    preferences: {
      kicker: "Preferences obligatoires",
      title: "Preferences",
      description:
        "Ces choix structurent le contexte d'entretien. Plus tard, le catalogue pourra utiliser toute la taxonomie backend; pour le MVP, il utilise une petite liste test.",
      rolePlaceholder: "Tapez un role ou parcourez la liste...",
      toggleRoleChoices: "Afficher ou masquer les roles",
      recommendedForYou: "Recommande pour vous",
      recommended: "Recommande",
      noRoleMatch: "Aucun role dans la liste MVP ne correspond encore.",
      addTypedRolePrefix: "Ajouter",
      addTypedRoleSuffix: "",
      selectedTargetRoles: "Roles cibles selectionnes",
      targetRoleRequired: "Choisissez au moins un role cible pour continuer.",
      locationPlaceholder: "Paris, remote UE",
      workSetupRequired: "Selectionnez au moins un mode de travail.",
      workSetupLabels: {
        remote: "A distance",
        hybrid: "Hybride",
        onsite: "Sur site"
      }
    }
  },
  prepare: {
    nextStep: "Prochaine etape",
    title: "Preparez l'entretien.",
    body:
      "Ce MVP utilise un entretien texte calme. Ce n'est pas un test de personnalite ni une machine de rejet cachee. Les reponses creent des preuves pour des recommandations revues par des humains.",
    languageTitle: "Langue de l'entretien",
    languageDetail: "Les questions et la transcription live utiliseront la langue choisie.",
    acknowledgement:
      "Je comprends qu'il s'agit d'un entretien assiste par AI qui cree des preuves pour des recommandations revues par des humains, pas une decision automatique d'embauche ou de rejet.",
    disclosureVersion: "Version de l'information:",
    continueToDeviceCheck: "Continuer au controle des appareils",
    backToResume: "Retour au CV",
    modulesAria: "Modules d'entretien",
    modulesTitle: "A quoi s'attendre",
    modules: [
      "Motivation pour le role et preferences de travail",
      "Communication linguistique requise",
      "Connaissance du domaine du role",
      "Petit echantillon de travail ou reponse structuree",
      "Scenario client ou cas"
    ],
    saveResumeNote: "Sauvegarder et reprendre reste dans le workflow d'entretien.",
    safetyAria: "Regles de securite de l'entretien",
    safetyTitle: "Limites de scoring",
    safetyRules: [
      "Aucun scoring du visage, emotion, personnalite, biometrie, accent ou langue maternelle.",
      "La langue requise par le role est evaluee seulement comme preuve de communication.",
      "Faible confiance signifie revue necessaire, pas rejet du candidat."
    ]
  },
  deviceCheck: {
    title: "Controlez votre camera et votre micro.",
    affirmations: [
      "Vous pouvez le faire.",
      "Nous croyons en vous.",
      "Votre configuration semble prete.",
      "Prenez une respiration calme.",
      "Defendez votre valeur."
    ],
    camera: {
      label: "Camera",
      actionLabel: "Tester camera",
      readyLabel: "Camera prete",
      notStarted: "L'apercu camera n'a pas encore demarre.",
      unavailable: "Le test camera n'est pas disponible dans ce navigateur.",
      opening: "Ouverture de l'apercu camera...",
      ready: "Apercu camera pret.",
      blocked: "Autorisez l'acces camera ou fermez une autre application qui l'utilise.",
      previewAria: "Apercu camera",
      previewLabel: "Apercu camera",
      openingShort: "Ouverture...",
      notTested: "Non testee"
    },
    microphone: {
      label: "Micro",
      actionLabel: "Tester micro",
      readyLabel: "Micro pret",
      notStarted: "Le niveau micro n'a pas encore demarre.",
      unavailable: "Le test micro n'est pas disponible dans ce navigateur.",
      listening: "Ecoute de l'entree micro...",
      ready: "Le micro recoit du son.",
      blocked: "Autorisez l'acces micro ou choisissez une autre entree.",
      meterAria: "Indicateur d'entree micro"
    },
    needsTest: "Test requis",
    testing: "Test en cours...",
    startInterview: "Demarrer l'entretien",
    ready: "Tous les elements sont prets.",
    testBoth: "Testez les deux appareils pour continuer."
  },
  movingForward: {
    decision: "Apres examen attentif, nous souhaitons continuer avec vous.",
    handoff: "Preparation de votre entretien.",
    ariaLabel: "Suite du processus"
  },
  interview: {
    ...it.interview,
    workspaceLabel: "Espace d'entretien reserve au candidat",
    interviewVideoAria: "Video d'entretien",
    avatarAlt: "Placeholder video de l'interviewer AI",
    sessionPaused: "Session en pause",
    resumeWhenReady: "Reprenez quand vous etes pret",
    sessionComplete: "Session terminee",
    answersPrivate: "Vos reponses restent privees jusqu'a votre choix de partage",
    interviewVideo: "Video d'entretien",
    answerTimeEnded: "Temps de reponse termine.",
    microphoneOffSaveWithRetry:
      "Micro coupe. Nous enregistrerons ce qui a ete capture dans {seconds}s sauf si vous reessayez.",
    microphoneOffSave: "Micro coupe. Nous enregistrerons ce qui a ete capture dans {seconds}s.",
    tryAgain: "Reessayer cette reponse",
    saveCaptured: "Enregistrer ce qui a ete capture",
    save: "Enregistrer",
    continueInterview: "Continuer l'entretien",
    pauseInterview: "Mettre en pause",
    options: "Options d'entretien",
    resumeSaved: "Reprendre l'entretien sauvegarde",
    startOver: "Recommencer",
    prepare: "Preparation",
    questionAppearsPrefix: "La question apparait dans",
    questionAppearsSuffixSingular: "seconde.",
    questionAppearsSuffixPlural: "secondes.",
    currentQuestion: "Question actuelle",
    hide: "Masquer",
    showAll: "Tout afficher",
    transcriptAria: "Transcription et reponse",
    transcript: "Transcription",
    candidatePrivate: "Prive candidat",
    you: "Vous",
    transcribedResponse: "Reponse transcrite",
    readOnly: "Lecture seule",
    spokenResponsePlaceholder:
      "Votre reponse orale apparaitra ici apres que vous avez fini de parler.",
    complete: "Termine",
    continueFallback: "Continuer",
    startAgain: "Recommencer",
    confirmStartOver: "Recommencer et effacer cet entretien de cet appareil?",
    savedNotFound: "Aucun entretien sauvegarde n'a ete trouve sur cet appareil.",
    restoreFailed: "L'entretien sauvegarde n'a pas pu etre restaure.",
    autosaveFailed:
      "Ce navigateur n'a pas pu sauvegarder l'entretien localement. Vous pouvez continuer, mais la reprise peut ne pas fonctionner.",
    deviceCheckFallbackMessage:
      "Impossible d'acceder a la camera ou au micro. Verifiez les permissions systeme.",
    timedOut:
      "Cet entretien live a expire. Recommencez quand vous etes pret; cela ne cree pas de score negatif.",
    resumeBeforeSaving: "Reprenez l'entretien avant d'enregistrer une reponse.",
    endedReviewOrRestart: "Cette session d'entretien est terminee. Revoyez le resultat ou demarrez une nouvelle session.",
    transcriptLimit: "Cet entretien a atteint la limite de transcription et necessite une revue.",
    transcriptNotReady: "La transcription de la reponse n'est pas encore prete.",
    answerCouldNotSave: "La reponse n'a pas pu etre enregistree.",
    transitionFollowUp: {
      eyebrow: "Suivi",
      title: "Reponse enregistree. Un court suivi est pret.",
      detail:
        "Il sert a clarifier les preuves ou la confiance. Faible confiance signifie travail de revue, pas mauvais candidat.",
      actionLabel: "Ouvrir le suivi"
    },
    transitionSaved: {
      eyebrow: "Enregistre",
      title: "Reponse enregistree.",
      detail: "Avancez quand vous etes pret. Le prochain prompt reste masque jusqu'a votre choix.",
      actionLabel: "Question suivante"
    },
    viewfinderYou: "Vous (candidat)",
    viewfinderTimeRemaining: "Temps de reponse restant",
    viewfinderTimeLeft: "Temps restant",
    viewfinderBlocked: "Camera/micro bloque",
    viewfinderRetry: "Reessayer l'acces",
    viewfinderMuted: "Camera et micro coupes",
    viewfinderSessionDone: "Session terminee",
    viewfinderPaused: "En pause",
    viewfinderMic: "Micro",
    voice: {
      initial: "Le micro demarre quand la question apparait.",
      emptySpeech: "Aucune parole n'a ete capturee. Vous pouvez mettre en pause ou reessayer cette question.",
      answerTimeEnded: "Temps de reponse termine.",
      answerCaptured: "Reponse capturee.",
      timeUp: "Temps ecoule.",
      stoppedBeforeStart: "La transcription live a ete arretee avant de demarrer.",
      disconnected: "Transcription live deconnectee. Vous pouvez mettre en pause ou reessayer.",
      unavailable: "L'enregistrement vocal n'est pas disponible dans ce navigateur.",
      starting: "Demarrage...",
      listening: "Ecoute.",
      saving: "Enregistrement...",
      doneSpeaking: "J'ai fini de parler",
      couldNotStart: "La transcription live n'a pas pu demarrer.",
      authModeMissing: "Le mode auth de transcription live n'a pas ete retourne.",
      credentialMissing: "La credential de transcription live n'a pas ete retournee.",
      socketFailed: "Impossible d'ouvrir le socket Deepgram."
    },
    shell: {
      ...it.interview.shell,
      autosaveReady: "Autosave pret",
      autosaved: "Autosauvegarde",
      completeStatus: "Termine",
      expired: "Expire",
      disconnected: "Deconnecte",
      needsReview: "Revue requise",
      paused: "En pause",
      textFallback: "Fallback texte",
      active: "Actif",
      completedDetail: "Vos reponses sont sauvegardees pour revue candidat avant tout choix de partage.",
      expiredDetail:
        "La session d'entretien a expire. Recommencez quand vous etes pret; l'expiration n'a pas d'impact negatif.",
      disconnectedDetail:
        "La connexion live s'est terminee. Continuez seulement apres revue ou redemarrage; la deconnexion n'a pas d'impact negatif.",
      failedDetail: "La session a rencontre un probleme technique et necessite une revue avant scoring.",
      pausedDetail: "Pause par vous. Reprenez quand vous etes pret a continuer la meme question.",
      textFallbackDetail: "Fallback texte actif. Tapez votre reponse et enregistrez-la quand elle est prete.",
      mockDetail: "Mode mock actif, donc aucun vendor avatar externe ou cle payante n'est requis.",
      allQuestionsComplete: "Toutes les questions sont terminees.",
      interview: "Entretien",
      transcriptTitle: "Transcription",
      transcriptEmpty: "La transcription apparait ici pendant l'entretien mock.",
      textFallbackOn: "Fallback texte actif",
      voiceFirst: "Voix d'abord",
      typeFallback: "Tapez la reponse dans le champ fallback. Elle est sauvegardee comme contenu transcrit.",
      switchToText: "Passez au texte si parler n'est pas confortable ou disponible.",
      saveTypedAnswer: "Enregistrer reponse tapee",
      answerByVoice: "Repondre a voix",
      interviewComplete: "Entretien termine",
      interviewInProgress: "Entretien en cours",
      reviewScoreExplanation: "Verifier l'explication du score",
      continueInterview: "Continuer l'entretien",
      completionDetail:
        "Revoyez explications, confiance, preuves manquantes et choix de partage avant tout acces employeur.",
      progressDetail: "Repondez a une question a la fois. Vous pouvez mettre en pause, reprendre ou utiliser le texte."
    },
    ux: {
      ...it.interview.ux,
      interviewComplete: "Entretien termine",
      question: "Question",
      of: "sur",
      allAnswersSaved: "Toutes les reponses sont sauvegardees pour revue candidat et scoring supervise par humain.",
      startFirstQuestion: "Commencez par la premiere question pertinente pour le role.",
      answerSavedContinue: "Reponse sauvegardee. Continuez vers la prochaine etape pertinente.",
      continueToScores:
        "Continuez vers les explications privees du score avant de revoir les choix de partage entreprise.",
      addEvidenceThenReturn:
        "Ajoutez la preuve demandee, puis l'entretien revient au parcours module prevu.",
      answerThenMoves:
        "Repondez a cette question, puis AssumerAI l'enregistre et passe a l'etape suivante.",
      scoreExplanationPreview: "Apercu de l'explication du score",
      confidenceComplete:
        "La confiance est separee de la qualite du score: une preuve fine cree du travail de revue, pas un resultat negatif automatique.",
      humanReviewComplete:
        "Des reviewers humains inspectent preuve, confiance, donnees manquantes et calibration role avant toute action employeur.",
      consentComplete:
        "Vous revoyez l'explication du score et chaque match entreprise avant qu'un employeur voie les preuves d'entretien.",
      answerCanSupport: "Ce que cette reponse peut soutenir",
      confidenceFollowUp:
        "Ce suivi augmente la confiance. Faible confiance signifie revue necessaire, pas score negatif.",
      confidenceActive:
        "Des preuves claires et precises augmentent la confiance; les details manquants creent des notes de revue, pas un rejet automatique.",
      humanReviewActive: "Les scores restent des recommandations avec preuves pour revue humaine, pas des decisions automatisees.",
      consentActive:
        "Les employeurs ne peuvent pas voir cet entretien, transcription ou explication du score jusqu'a acceptation d'un match.",
      followUpAdded: "Suivi ajoute."
    }
  },
  results: {
    ...it.results,
    controlsAria: "Controles du resultat candidat",
    statusAria: "Statut du resultat",
    evidenceAria: "Resume des preuves",
    actionsAria: "Actions candidat",
    resultActionsAria: "Actions resultat candidat",
    scoreExplanationAria: "Explication du score",
    heroTitle: "Cela reste revu par des humains et controle par le candidat.",
    reviewRequested: "Revue demandee",
    reviewStatusTitle: "Vos demandes de revue humaine",
    reviewStatusOpen: "En attente de revue humaine",
    reviewStatusUpheld: "Revu : evaluation d'origine confirmee",
    reviewStatusAdjusted: "Revu : ajustee avec motif documente",
    reviewOutcomeReason: "Motif du relecteur",
    requesting: "Demande en cours...",
    queued: "En file",
    reviewCreateError: "La demande de revue humaine n'a pas pu etre creee.",
    needsReviewTitle: "Ce qui necessite encore une revue",
    privacyTitle: "Garanties de confidentialite candidat",
    needsReviewBody:
      "Les preuves manquantes augmentent les questions de confiance et de revue. Ce n'est pas un signal de rejet candidat.",
    privacyBody:
      "Ces regles gardent le resultat prive jusqu'a ce que vous choisissiez un match specifique a partager."
  },
  matches: {
    ...it.matches,
    stageAria: "Decisions de match candidat",
    boundaryAria: "Limite de partage",
    listAria: "Matches disponibles",
    scoreAria: "Score du match et confiance",
    includedAria: "Categories de donnees incluses",
    excludedAria: "Categories de donnees exclues",
    eyebrow: "Revue privee des matches",
    title: "Matches controles par le candidat",
    summary:
      "L'employeur ne voit pas votre profil, scorecard, transcription ou explication de match sauf si vous acceptez le partage pour cette entreprise et ce role exact.",
    boundaryTitle: "L'employeur ne peut pas voir",
    boundaryDetail: "0 partage actif jusqu'a acceptation d'un match.",
    confidence: "confiance",
    whyFit: "Pourquoi cela peut convenir",
    evidenceAndGaps: "Preuves et ecarts",
    sharingPreview: "Apercu de partage limite",
    sharingBody:
      "Accepter cree un enregistrement de consentement seulement pour cette entreprise et ce role. La revue humaine reste requise avant les decisions cote employeur.",
    excludedNote: "Le CV brut et les medias bruts d'entretien restent exclus.",
    acceptSharing: "Accepter le partage",
    declineMatch: "Refuser le match",
    decisionRecorded: "Decision enregistree:",
    statuses: {
      accepted: "Partage accepte",
      declined: "Match refuse",
      awaiting_candidate: "En attente de votre decision"
    }
  },
  dataControls: {
    ...it.dataControls,
    heroAria: "Controles des donnees",
    guaranteesAria: "Garanties de confidentialite",
    actionsAria: "Actions donnees candidat",
    eyebrow: "Controles candidat",
    title: "Vos donnees, revue et retention.",
    summary:
      "Une petite salle de controle pour ce qui ne doit jamais etre cache: revue humaine, export, suppression et delais de retention.",
    proofTitle: "Aucun rejet automatique.",
    proofLines: [
      "Les demandes creent des IDs audit et restent visibles au candidat.",
      "Le partage employeur reste specifique au match et soumis au consentement."
    ],
    reviewEyebrow: "Revue humaine",
    reviewTitle: "Demandez a une personne de revoir un resultat.",
    reviewTarget: "Objet de revue",
    targetId: "ID objet",
    whatChecked: "Que faut-il verifier?",
    optionalNotes: "Notes de preuve optionnelles",
    requestHumanReview: "Demander une revue humaine",
    rightsEyebrow: "Droits sur les donnees",
    rightsTitle: "Exporter ou supprimer vos donnees candidat.",
    rightsBody:
      "L'export inclut profil, CV brut, scorecards, transcription d'entretien, explications de match, consentements et metadonnees audit. La suppression conserve seulement le minimum d'audit necessaire a prouver la demande.",
    requestExport: "Demander export",
    requestDeletion: "Demander suppression",
    retentionEyebrow: "Retention",
    retentionTitle: "Les delais d'auto-suppression sont visibles ici.",
    requesting: "Demande en cours...",
    reviewDefaultSummary:
      "Merci de faire verifier ceci par un reviewer humain avant son utilisation dans les prochaines etapes.",
    reviewFailed: "Demande de revue humaine echouee.",
    exportFailed: "Demande d'export des donnees echouee.",
    deletionFailed: "Demande de suppression des donnees echouee.",
    workflowFailed: "Demande workflow donnees candidat echouee.",
    defaultRawCvDeleteAfter: "30 jours apres l'import",
    reviewQueuedPrefix: "En file avec evenement audit",
    exportQueuedPrefix: "Export en file:",
    deletionQueuedPrefix: "Suppression en file:",
    returnToProfile: "Retour au profil utilisateur",
    targets: {
      resume_scorecard: "Scorecard CV",
      interview_scorecard: "Scorecard entretien",
      company_match: "Match entreprise",
      candidate_profile: "Profil candidat",
      data_access: "Acces donnees ou partage"
    },
    retention: {
      rawCv: "CV brut",
      rawInterviewMedia: "Medias bruts d'entretien",
      consentAudit: "Enregistrements consentement et audit",
      rawCvDetail: "Auto-suppression apres extraction du profil sauf retention legale.",
      rawMediaDetail: "Les medias d'integrite seule sont supprimes apres transcription et scoring.",
      consentAuditDetail: "Preuve audit minimale conservee pour droits, revue et litiges.",
      hoursSuffix: "heures",
      daysSuffix: "jours"
    }
  }
};

export const candidateFlowCopy: Record<CandidateInterviewLanguageCode, CandidateFlowCopy> = {
  en,
  it,
  fr
};

export function resolveCandidateFlowCopy(value: unknown): CandidateFlowCopy {
  return candidateFlowCopy[resolveCandidateInterviewLanguageCode(value)];
}
