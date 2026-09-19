---
source: "ChatGPT Deep Research"
captured_at: "2026-09-19T17:37:28.060326+00:00"
evidence_status: "Unreviewed source report. Validate claims before adding them to canonical vault notes."
---

# ClaimProof Candidate Experience Decision Report

**Research freshness:** September 19, 2026, America/New_York  
**Decision owner:** ClaimProof team  
**Candidate-experience owner:** Person 2  
**Authorization boundary:** This is unreviewed research material for UX, prototype, security, and legal review. It does **not** authorize implementation, legal conclusions, biometric or behavioral analysis, product claims, or hiring decisions.

## Executive recommendation

### Decision

**Cut mandatory entire-display recording from the hackathon MVP and do not make it the near-term default. Adopt Option D as the baseline, with Option E as the preferred job-relevant enhancement when a claim genuinely benefits from an artifact or work sample.**

In practical terms, the MVP should conduct the accepted **single 15-minute, claim-linked interview with no camera and no screen recording**, preserving:

**claim → source → question → answer → transcript provenance → explicit artifact, if supplied → bounded evidence status.**

Use voice as the primary interaction with a genuinely equal text path. Where the job and claim make it appropriate, let the candidate intentionally present or upload a specific artifact or complete a bounded work sample rather than passively recording everything visible on their computer.

**Confidence: high.**

The strongest reason is not simply privacy. Mandatory full-display recording performs poorly on the product's central epistemic question: **what additional recruiter-relevant fact does it actually establish?** A web application cannot make the browser give it exclusive control over the share picker; the Screen Capture specification requires the end user to choose the display surface, forbids applications from narrowing the user's available choices through ordinary constraints, does not persist granted capture permission, and explicitly recommends steering users away from monitor capture because of privacy risks. A site can inspect the selected surface type afterward and reject it, but that turns "requiring a monitor" into a coercive retry loop rather than reliable monitor selection. citeturn1search23turn3view1turn3view3

The API also models a monitor as a display surface that may represent a physical display **or an aggregation of multiple physical displays**. Display-capture sources are not enumerable and cannot be selected by stable `deviceId`. Consequently, ClaimProof cannot robustly establish "this is the candidate's one complete physical monitor and no other display exists." citeturn3view2turn3view1

More importantly, even a perfectly recorded monitor does **not** establish identity, authorship of the underlying résumé/application, honesty, independent work, competence, or absence of off-screen assistance. Another physical monitor, telephone, printed material, another person, previously prepared text, accessibility technology, or information outside the captured surface may remain invisible. Treating monitor recording as "provenance" therefore risks creating a stronger trust signal than the evidence supports. **[Engineering inference; locally validate, but the limitation follows from the capture boundary.]**

By contrast, ClaimProof's source-linked questioning already produces a more defensible provenance chain: the application supplied a claim; the system displayed that claim to the candidate; the candidate responded to a documented question; the response was preserved with timestamps and lineage; and any artifact is knowingly supplied for that specific claim. That evidence is narrower but much easier to describe truthfully.

### Recommended product shape

The near-term architecture should therefore be:

**D as the universal core:** no display recording; preserve audio, transcript, timestamps, question lineage, correction history, and candidate-supplied evidence.

**E as the evidence-strengthening extension:** for suitable roles or claims, invite one bounded artifact walkthrough or job-relevant work sample. The candidate knows exactly what evidence is being inspected rather than exposing unrelated desktop activity.

**B only as a research branch, not an assessment feature:** optional screen sharing can be prototyped to learn browser behavior, but screen participation should not alter candidate status or recruiter treatment until incremental usefulness is independently demonstrated.

**A should not proceed** without meeting demanding reversal conditions described below.

**C should be rejected for the MVP:** recording the ClaimProof tab adds surveillance and storage while primarily recording ClaimProof's own interface. It establishes little beyond information ClaimProof can already log directly.

**F should be rejected despite technical simplicity:** it abandons ClaimProof's core claim graph, source-linked questions, and traceability and therefore fails the accepted product concept.

### Reversal conditions for mandatory display recording

Reconsider Option A only after **all** of the following are true:

1. A blinded study shows that display-derived **explicit job-relevant evidence**, excluding behavior, timing, navigation style, tone, and similar signals, materially improves claim adjudication compared with transcript + artifact evidence.
2. Candidates can decline display capture and complete an equivalent assessment without an adverse inference or hidden penalty.
3. Counsel approves the notice, recording-consent mechanism, accommodation policy, retention/deletion model, recruiter access, and jurisdictional rollout.
4. A security review approves the collection, storage, incident-response consequences, and third-party-data handling.
5. Usability testing demonstrates that candidates understand exactly what the browser is capturing and do not interpret recording as identity/honesty detection.
6. The supported-browser matrix passes source selection, permission denial, capture termination, multiple-display, OS-permission, and recovery tests.
7. ClaimProof can accurately describe the feature as recording a **user-selected display surface**, not as proving that it recorded every screen, every source of assistance, or the candidate's complete computing environment. The W3C specification itself permits logical aggregation of physical monitors. citeturn3view2
8. Accidental capture of sensitive unrelated material is absent in controlled testing and residual risk is accepted by security/privacy owners.

A typed name by itself should **not** be one of the reversal criteria. It can document acknowledgment; it does not solve the underlying power imbalance or change what the browser can do.

## Evidence and option decision

### Comparative assessment

The scoring below uses 5 = strongest. It is an **engineering/product judgment**, not a validated psychometric model. The weighting follows the owner's stated ordering: dignity/privacy/accessibility dominate demo novelty and delivery speed.

| Criterion | Weight | A mandatory monitor | B optional monitor | C ClaimProof tab | D no screen | E bounded artifact/work sample | F generic AI interview |
|---|---:|---:|---:|---:|---:|---:|---:|
| Dignity / meaningful choice | 18 | 1 | 3 | 3 | **5** | **5** | 3 |
| Privacy / security / minimization | 15 | 1 | 2 | 3 | **5** | 4 | 4 |
| Accessibility / availability | 12 | 1 | 3 | 3 | **5** | 4 | 4 |
| Accuracy of trust claim | 11 | 2 | 2 | 1 | 4 | **5** | 1 |
| Traceability / recruiter usefulness | 10 | 3 | 3 | 2 | **5** | **5** | 1 |
| Technical robustness | 9 | 1 | 2 | 3 | **5** | 4 | 4 |
| Simplicity / reversibility | 7 | 1 | 2 | 3 | **5** | 3 | 4 |
| Candidate understanding / anxiety | 6 | 1 | 3 | 3 | 4 | 4 | 2 |
| Demo clarity / distinctiveness | 5 | **5** | 4 | 3 | 4 | **5** | 1 |
| Recruiting / ATS scalability | 4 | 2 | 3 | 3 | **5** | 4 | 3 |
| Four-hour delivery | 3 | 2 | 3 | 3 | **5** | 3 | 4 |
| **Weighted result / 5** | **100** | **1.58** | **2.63** | **2.68** | **4.78** | **4.34** | **2.88** |

The numeric result does not rescue F: it violates the accepted product premise. The meaningful decision is therefore **D first, E second**.

### Why A loses

**[Externally supported + engineering inference]** The current W3C Screen Capture Working Draft says the user agent must let the end user choose among display surfaces and must not use media constraints to narrow that choice. `displaySurface` can influence presentation but not remove unrestricted end-user selection. It explicitly says user agents are strongly recommended to steer users away from monitor sharing because of privacy risks. citeturn1search23turn3view3

Chrome's own documentation reinforces that limitation: `displaySurface: "monitor"` can make a relevant picker pane prominent, but the application cannot pre-select a particular screen or window. Chrome provides `monitorTypeSurfaces` chiefly in the opposite direction—to **exclude** whole-screen surfaces to reduce accidental information leakage. citeturn1search9

After selection, `MediaStreamTrack.getSettings().displaySurface` can report `monitor`, `window`, or `browser`; therefore an application can detect a non-monitor selection and stop the stream. That is technically different from requiring the browser to offer or select only a monitor. citeturn3view3

This distinction matters. An A implementation would probably become:

> "Choose what to share" → candidate chooses window → ClaimProof rejects it → candidate is sent back to the browser picker → repeat until monitor chosen or candidate exits.

That is technically feasible in some environments but is a poor basis for claiming meaningful choice.

### What display recording would and would not establish

| Observation | Screen recording can support | It cannot establish |
|---|---|---|
| Candidate opens a document | That document appeared on the selected captured surface | Candidate authored it |
| Candidate navigates a repository | A repository/interface was displayed | Candidate owns the account or wrote the code |
| Candidate explains work while displaying an artifact | The explanation and artifact were temporally linked | The underlying claim is true |
| No AI/chat window appears | None appeared on that captured surface | No AI assistance was used |
| No other person appears | Nothing about people outside capture | Candidate was alone |
| One monitor was selected | Browser reported a monitor-like display surface, where supported | It was the candidate's only physical monitor |
| Candidate types an answer | Keystrokes/output appeared | Candidate independently generated the ideas |
| Recording remains uninterrupted | Capture continued | Honesty, competence, or identity |

The Web standard expressly recognizes that systems may have multiple monitors and may aggregate multiple physical monitors into a logical monitor. It also prevents sites from enumerating display sources through `enumerateDevices`. citeturn3view2turn3view1

Therefore **"we saw their screen" must never become "we verified their honesty," "we proved they did it themselves," or "we proved their identity."**

### Applicant-reaction and validity evidence

The peer-reviewed literature retrieved for this review confirms that applicant attitudes toward AI-mediated and asynchronous video selection are studied as questions of procedural justice, expectations, trust, and intention to participate; that is separate from whether a method has criterion-related or predictive validity. Recent literature continues to treat applicant reactions as a distinct concern in AI-enabled hiring. citeturn12search0turn12search5

However, **this research pass did not retrieve sufficiently strong primary evidence establishing the applicant-reaction effect of mandatory full-desktop recording in employment interviews specifically**, nor evidence that such capture has incremental predictive validity for job performance. Claims such as "screen recording increases trust" or "screen recording produces more valid hiring evidence" should therefore be classified **weak/unsupported**, not assumed.

Likewise, remote-proctoring findings should not be automatically imported into employment selection. Proctoring and hiring differ in incentives, legal context, stakes, constructs, and expectations. Any ClaimProof-specific anxiety/completion effect is an **experiment required**, not something public literature can settle for the product.

## Browser and technical feasibility

### Core answer to the browser question

The most important technical finding is unambiguous:

> **A normal browser application cannot reliably command the Screen Capture API to capture exactly one particular physical monitor.**

The August 27, 2026 W3C Screen Capture Working Draft says `getDisplayMedia()` acquires a display source **chosen by the end user each time**. The user agent must offer user choice rather than allowing application constraints to determine the source. Granted permission cannot be persisted. A transient user activation is required. citeturn1search23turn3view1

The current specification also says:

* display sources cannot be enumerated via `enumerateDevices`;
* applications cannot select them using `deviceId`;
* `displaySurface` reports the type after capture;
* a "monitor" may represent one physical monitor **or a collection of physical monitors**;
* when a source becomes permanently inaccessible, such as a source window closing, the corresponding media track must end. citeturn3view1turn3view2turn3view3

The current W3C document is still a **Working Draft**, published August 27, 2026, and expressly warns that it remains subject to change. Local browser testing remains mandatory even where normative behavior is clear. citeturn1search23

### Capability matrix

**Legend:**  
**Yes** = supported by the standard/current vendor documentation sufficiently for product reasoning.  
**Hint** = application can express a preference, not enforce it.  
**Test** = do not ship based on public documentation alone.  
**No** = architecture cannot safely rely on it.

| Capability | Chrome / Windows | Chrome / macOS | Firefox / Windows | Firefox / macOS | Safari / macOS |
|---|---|---|---|---|---|
| Browser-mediated display capture | Yes; test OS permissions | Yes; test OS permissions | Test current implementation | Test current implementation | Test current implementation |
| Candidate chooses source in browser UI | **Yes** | **Yes** | Required by standard | Required by standard | Required by standard |
| App forces a particular physical monitor in picker | **No** | **No** | **No** by standards model | **No** by standards model | **No** by standards model |
| App hints/preselects surface *type* | Chrome-documented hint | Chrome-documented hint | Test | Test | Test |
| App can exclude monitor surfaces | Chrome-documented | Chrome-documented | Test | Test | Test |
| App reads selected surface type after capture | Standard `displaySurface`; test | Same | Test implementation | Test implementation | Test implementation |
| App identifies exact physical monitor using stable ID | **No** | **No** | **No** | **No** | **No** |
| One API call deliberately captures several independent monitors | **No** | **No** | **No** | **No** | **No** |
| A logical monitor could encompass several physical displays | Possible per spec | Possible per spec | Possible per spec | Possible per spec | Possible per spec |
| Persistent "always allow display recording" permission | **No** under web API | **No** | **No** | **No** | **No** |
| Fresh user activation required | Yes | Yes | Required | Required | Required |
| Browser/OS capture indicator | Browser/OS controlled | Browser/OS controlled | Browser/OS controlled | Browser/OS controlled | Browser/OS controlled |
| User can terminate using browser/OS UI | Yes | Yes | Test UX | Test UX | Test UX |
| Source closing/interruption detectable | Track termination/events; test | Same | Test | Test | Test |
| System/display audio | OS/surface dependent; test | OS/surface dependent; test | Test | Test | Test |
| Microphone guaranteed through `getDisplayMedia` | **No** | **No** | **No** | **No** | **No** |

Chrome documents `displaySurface`, `monitorTypeSurfaces`, `surfaceSwitching`, `selfBrowserSurface`, and `systemAudio` controls, but describes them as preferences or browser UX controls rather than authority to select a specific source. citeturn1search9 MDN's current documentation, last modified September 7, 2026, similarly describes the capture options as hints, notes that browsers can ignore audio-related hints, and warns that screen capture is not a Baseline feature across all widely used browsers. citeturn1search16turn3view4

**Firefox and Safari qualification:** the public sources retrieved in this review were not sufficient to certify current 2026 implementation parity for Chrome's newer preference fields on each OS. Those cells are intentionally "Test," not inferred from Chrome. That uncertainty alone is inconsistent with making monitor capture a mandatory four-hour-MVP dependency.

### Permission and indicator semantics

The application can provide its own explanation and obtain its own consent **before** capture. It cannot replace the subsequent browser-owned permission/selection interaction.

The standard requires fresh end-user selection and forbids persistence of a granted `getDisplayMedia` permission. It extends browser privacy-indicator requirements to display capture and recommends a prominent indicator while content is actively captured. citeturn3view0turn3view1

Therefore:

**ClaimProof signature → does not equal browser permission.**

The correct sequence is:

`ClaimProof notice → candidate acknowledgment → user clicks Start → browser picker → browser/OS permission → selected stream → ClaimProof verifies capabilities`

An in-app "I consent" button must never make UX copy such as "You have granted screen access." Only the browser/OS can complete that step.

### Multiple-display and hidden-surface problem

The browser API makes mandatory display capture particularly weak as anti-assistance evidence. The app does not get an inventory proving how many independent displays or other devices exist. The specification deliberately avoids enumerating display capture sources because doing so would reveal too much about the host system. citeturn3view1

Window capture has another ambiguity: the specification distinguishes **logical** surfaces from only their currently visible portion. Occlusion, minimization, OS rendering behavior, and muting can affect what is available, so ClaimProof should not infer what the candidate personally saw merely from recorded pixels. citeturn3view2

### Technical fallback policy

The deterministic fallback hierarchy should be:

`LLM unavailable → fixed source-linked question templates`

`adaptive generation unavailable → fixed "give one concrete example / evidence" follow-up`

`microphone denied → typed mode immediately`

`transcription unavailable → preserve permitted audio but continue subsequent answers in typed mode; do not fabricate transcript`

`artifact service unavailable → continue without artifact and mark evidence source unavailable`

`external browsing unavailable → no external-verification claim`

`screen-share unavailable → irrelevant to accepted MVP`

No service failure should change a claim from unresolved to demonstrated or partially demonstrated by default.

## Candidate experience, language, and accessibility

### Recommended candidate journey

**Invitation**

> **Add context to three parts of your application**  
> ClaimProof will ask about three specific claims from your application in one interview lasting about 15 minutes. You can answer by voice or text. No camera is required.  
>  
> This is an opportunity to add evidence and context. ClaimProof does not determine whether you are honest and does not analyze your appearance, accent, emotion, personality, or behavior.

This directly supports the owner's "add context" framing rather than creating an interrogation metaphor.

**Focus-area preview**

Show exactly three cards:

> **Focus area:** Led migration of payment infrastructure  
> **Source:** Resume · Experience · Acme Corp  
>  
> You can flag a source or extraction mistake before the interview. The selected focus area will remain visible so the interview record stays traceable.

Actions:

`Looks correct`  
`Flag source/extraction issue`

Do **not** let "flag" silently rewrite the underlying recruiter-selected claim.

**Recording and participation choice**

Default MVP:

> Choose how you'd like to answer:
>
> **Speak** — microphone audio is recorded and transcribed.  
> **Type** — no microphone recording is needed.
>
> You can switch to typing during the interview. Your response method is not an assessment signal.

The last sentence should be a true system guarantee before shipping.

**Interview**

Each question carries three persistent labels:

> **Source claim**  
> "Reduced onboarding time by 40%."
>
> **Why we're asking**  
> "We're asking for the context and evidence behind the reported improvement."
>
> **Question**  
> "Walk us through what changed, how the 40% was measured, and what part you personally owned."

No hidden behavioral metrics should be collected for assessment.

**One adaptive follow-up**

The single follow-up should target an information gap, not perceived suspiciousness.

Good:

> "You mentioned the before-and-after onboarding times. What record or measurement did the team use?"

Bad:

> "Your answer sounded uncertain. Are you sure this really happened?"

The latter converts voice/behavior into an honesty inference and violates the stated ClaimProof boundary.

**Transcript review**

Candidate may correct transcription only:

> **Correct transcription**
>
> Change words that the transcript got wrong. This does not replace your original recording.

Separate button:

> **Add clarification**
>
> Add information you want the recruiter to see. This will appear as a labeled clarification after your original answer.

Keep immutable lineage:

`original audio → original machine transcript → transcription correction → candidate clarification`

Do not silently rewrite earlier material.

**Completion**

Show three separate status cards and no overall numerical score.

> **Demonstrated**  
> The evidence provided in this interview directly supported the parts of this claim that were assessed.

> **Partially demonstrated**  
> The interview supported some parts of this claim, while other relevant parts remained unsupported or unclear.

> **Unresolved**  
> The interview did not provide enough relevant evidence to assess this claim.

Permanent limitation banner:

> **What these labels mean**  
> These statuses describe the evidence available in this interview. They are not judgments about truthfulness, character, competence, or whether you should be hired.

That limitation is essential because the ordinary-language meaning of "demonstrated" can otherwise sound like an adjudication of truth.

### Fifteen-minute structure

Use time as a **session-management constraint**, never an assessment feature.

| Elapsed time | Experience |
|---|---|
| 0:00–0:45 | Recap purpose, answer-mode choice, accessibility reminder |
| 0:45–3:30 | Claim A source-linked opening |
| 3:30–6:15 | Claim B source-linked opening |
| 6:15–9:00 | Claim C source-linked opening |
| 9:00–12:00 | One adaptive follow-up targeting the highest evidence gap |
| 12:00–14:00 | Candidate-added clarification / artifact reference |
| 14:00–15:00 | Review next steps and completion |

Do not implement three separate hard answer timers. A visible overall progress indicator is safer than judging "response latency" or typing/speaking speed.

Candidates using typed answers, assistive technology, augmentative communication, speech-to-text, or accommodation must not be penalized for taking a different interaction path. EEOC/DOJ guidance specifically warns that software and algorithmic employment tools can create disability-discrimination problems, including where the technology does not appropriately accommodate applicants with disabilities. citeturn5search5turn5search9

### Voice-first does not mean voice-required

**Voice-first + equal text fallback is defensible only if "equal" is real.**

The report and recruiter interface must not expose:

* "candidate refused microphone";
* voice-vs-text as a quality feature;
* typing speed;
* response latency;
* speech fluency;
* accent;
* prosody;
* emotion;
* vocal confidence;
* pauses;
* assistive-technology use.

WCAG 2.2 is the appropriate engineering accessibility target for the browser experience, including keyboard operability, adequate timing, labels/instructions, error recovery, accessible status messages, and accessible authentication. WCAG itself is a technical standard, not by itself a statement of ClaimProof's precise legal obligation. citeturn12search1

### Accessibility and non-consent accommodation

The minimum product policy should be:

**Microphone declined or unavailable:** typed answers, same claims, same report semantics.

**Speech/hearing disability:** typed route available before any permission prompt; no need to disclose a diagnosis.

**Screen sharing declined:** under the recommendation, nothing changes because screen sharing is absent.

**If screen sharing is ever piloted:** an equivalent no-screen route must be prominent before consent, and recruiter output must not label the alternative as less trustworthy.

**Low bandwidth:** text route; defer artifact upload; no video dependency.

**Screen-reader / keyboard users:** complete flow through keyboard, semantically labeled claim cards, focus order, live status messages, no drag-only interactions.

**Need more time because of disability:** human accommodation route; fixed 15-minute timing must be modifiable where required rather than treated as a validity feature. EEOC guidance makes accommodation design especially important for algorithmic hiring systems. citeturn5search5

**Human contact:** put "Need an accommodation or help with this assessment?" beside Start, not in a footer reached only after consent.

## Privacy, security, consent, and legal boundary

### Why whole-display capture materially changes the risk profile

The Screen Capture specification itself identifies the obvious privacy/security risk: users may unintentionally share content that they did not intend or realize would be captured. The specification specifically recommends steering users away from monitor capture, and Chrome provides controls allowing applications to remove whole-screen choices to protect against leakage. citeturn3view0turn3view3turn1search9

For ClaimProof, the exposure is unusually consequential because the candidate is operating a general-purpose computer while participating in an employment process.

| Threat | Whole-display consequence | Severity | MVP treatment |
|---|---|---:|---|
| Message/email notification | Private third-party communication enters employment record | High | Eliminate screen collection |
| Password/secret/token appears | Credential compromise | Critical | Eliminate screen collection |
| Health/disability material | Sensitive information unrelated to job becomes visible | Critical | Eliminate screen collection |
| Current-employer information | Confidential/proprietary data collected | Critical | Eliminate screen collection |
| Family/financial content | Personal data enters recruiter system | High | Eliminate screen collection |
| Other candidates/customers | Third-party data captured without their participation | High | Eliminate screen collection |
| Multi-monitor setup | Captured screen creates false impression of complete observation | High | Never claim completeness |
| Phone/off-screen assistant | Invisible despite "full screen" recording | High epistemic risk | Do not use as independence proof |
| Screen-within-screen | Recursive/hall-of-mirrors confusion | Medium | Avoid capture; Chrome self-surface controls if experimenting |
| Stop-share/interruption | Evidence discontinuity | Medium | Detect track ending; continue no-screen |
| Recruiter replay of raw screen | Secondary exposure multiplies | Critical | Recruiters should not receive raw screen by default |
| Logs/analytics | Transcript/media leakage into observability systems | High | Explicit log exclusion |

Several threat descriptions are **engineering inferences from what a whole monitor necessarily contains**, rather than claims that the browser itself creates the data. The externally supported foundational risk is inadvertent display of unintended content. citeturn3view0turn1search9

### Recommended data flow

```text
Candidate application
        │
        ▼
Structured claim store
(claim + source pointer)
        │
        ▼
Candidate focus preview
        │
        ├──── source/extraction issue flag ───► human/recruiter review
        │
        ▼
15-minute interview engine
        │
        ├──── voice ──► audio recorder ──► transcription service
        │
        └──── text  ────────────────────────► answer stream
        │
        ▼
Immutable lineage record
claim → question → answer → correction → clarification
        │
        ├──── optional candidate-selected artifact
        │
        ▼
Bounded evidence assessment
        │
        ├────► Candidate: demonstrated / partially demonstrated / unresolved
        │
        └────► Recruiter: claim-by-claim evidence report

NO camera
NO desktop video
NO voiceprint
NO emotion/personality inference
NO behavioral-surveillance feature
```

### Minimum security controls

The MVP should minimize first: **the safest screen recording is the screen recording never collected.**

For retained interview information, production design should nevertheless require encryption in transit and at rest; per-tenant authorization; separation of raw media from recruiter-facing derived evidence; audit logging of privileged raw-media access; short-lived authenticated object links; deletion jobs; secure service-provider contracts; secrets isolation; no transcripts/audio in ordinary application logs; and incident-response procedures.

New York's SHIELD Act requires businesses owning or licensing computerized data that includes qualifying private information of New York residents to maintain reasonable administrative, technical, and physical safeguards and to dispose of protected information within a reasonable time when no longer needed. Whether a particular interview record meets the statute's definition of "private information" is fact-specific and requires counsel, but whole-screen capture clearly increases the chance of ingesting unrelated sensitive data. citeturn10view1

### Retention and deletion recommendation

**Hackathon:** use synthetic/demo candidate information and avoid durable raw-media persistence. Reset/delete the demo session after use.

**Production pilot:** do **not** select a final number of days from UX preference alone. Employment-record preservation requirements, litigation holds, employer policies, applicant rights, contractual responsibilities, and jurisdiction all affect retention.

The architecture should nevertheless establish two separate classes:

`raw media → shortest counsel-approved period`

`claim lineage / recruiting record → separately defined employment-record schedule`

Do not retain raw audio or future display recordings merely because the derived report must be retained.

Deletion UI should say:

> **Request deletion or access**
>
> Submit a request about the information ClaimProof holds about this interview. Some information may need to be retained when required by law or the employer's documented record obligations.

Do **not** promise "Delete everything instantly" until counsel can guarantee it.

### Consent recommendation

The owner assumption that a typed signature makes mandatory monitor recording sufficiently voluntary should be **rejected**.

**[Ethical/UX judgment; legal conclusion requires counsel.]** In a hiring context, the meaningful question is not whether the candidate typed a name. It is whether they understand the collection, have a realistic alternative, can refuse without an unsupported adverse inference, know how to stop/withdraw, understand retention/access, and have a human route for questions or accommodations.

A typed name can improve the audit trail of the notice. It should not be presented as proof that the candidate experienced the choice as voluntary.

#### Recommended MVP recording notice

> **Before you begin**
>
> ClaimProof will ask about three specific parts of your application.
>
> If you answer by voice, we will record your microphone audio and create a transcript. You can answer by text instead. Your choice between voice and text is not used as assessment evidence.
>
> We use the content of your answers, the source claims shown with each question, and any evidence you intentionally provide. We do not use your camera and do not analyze your accent, tone, emotion, personality, honesty, eye contact, disability, or other behavioral characteristics.
>
> You can stop the interview at any time.
>
> **Who can see the results:** [owner must define]  
> **How long recordings are kept:** [must be defined before production]  
> **How to request access or deletion:** [must be defined before production]  
> **Accommodation or human help:** [contact mechanism]

Suggested acknowledgment:

> ☐ I understand what will be recorded and how my interview information will be used.

A typed signature should only be added if counsel or the operating policy determines it serves a specific purpose:

> **Acknowledged by:**  
> Type your full name: __________
>
> Typing your name records your acknowledgment of the notice above.

That is safer than "I certify that I freely and voluntarily consent," which would make a stronger assertion about voluntariness than the UI itself can establish.

### Contingency copy if A survives review

**Do not ship this language until legal review and until ClaimProof can truthfully offer the alternative described.**

> **Whole-display recording**
>
> During this interview, ClaimProof will record the display surface you select in your browser. An entire-display recording may include notifications, messages, documents, account information, or other private content that appears on that display.
>
> ClaimProof cannot guarantee that only job-related information will appear in an entire-display recording.
>
> Before continuing, close private or confidential information and silence notifications.
>
> Screen recording is not used to determine your honesty, personality, emotion, disability, or other behavioral characteristics. It does not prove identity, authorship, or that no outside assistance was used.
>
> **Alternative:** You may complete the interview without display recording through [specific equivalent process]. Choosing that process will not by itself count against your assessment.
>
> You may stop sharing at any time using ClaimProof or your browser's sharing controls.
>
> **Retention:** [specific period]  
> **Who may access the recording:** [specific roles]  
> **Deletion/request process:** [specific mechanism]  
> **Human contact/accommodation:** [specific mechanism]

Signature:

> ☐ I have read what whole-display recording captures and understand the available alternative.
>
> Type your full name to acknowledge: __________

The statements about an equivalent path and no adverse treatment are **policy commitments**. Do not use them unless ClaimProof actually implements them.

### Separate browser-permission explanation

Immediately before `getDisplayMedia()`:

> **Next, your browser will ask what to share.**
>
> This is a browser-controlled permission step. ClaimProof cannot make the choice for you.
>
> Your browser may show its own sharing indicator and stop-sharing control while capture is active. You can stop from those browser controls at any time.

That language accurately distinguishes product consent from browser authorization. The specification requires end-user selection each time and does not allow persistent granted display permission. citeturn3view1turn3view0

### Relevant legal and regulatory landscape

This section identifies issues for counsel; it is **not legal advice**.

**Federal employment discrimination — enacted/effective.** Title VII and the ADA remain relevant when software or algorithms make or inform employment selection. EEOC/DOJ have specifically warned that employment technologies can unlawfully disadvantage people with disabilities. EEOC materials also address adverse impact in software/AI selection under Title VII. citeturn5search5turn5search8turn5search14

**Implication:** ClaimProof should preserve accommodation routes, prohibit behavioral/biometric inference, test differential failure/completion rates, and validate any feature that materially influences selection. **Counsel required.**

**NYC Local Law 144 / AEDT rules — enacted and effective.** NYC's adopted rules page continues to list the Automated Employment Decision Tools rule as **adopted, effective July 5, 2023**. The statutory/rule framework regulates certain automated tools used to make or substantially assist employment decisions, including bias-audit and transparency requirements. Whether ClaimProof's bounded evidence statuses and recruiter report constitute an AEDT depends on the product's actual role in decision-making and should not be self-declared by the product team. citeturn7search0turn5search3

**Implication:** design so ClaimProof can explain every input/output and preserve audit data, but obtain NYC employment counsel before saying Local Law 144 does or does not apply.

**New York recording/eavesdropping law — enacted.** New York Penal Law §250.00 defines prohibited wiretapping/mechanical overhearing in terms that generally turn on absence of consent from at least one party; it also covers interception/access of electronic communications. citeturn10view0

**Federal interception law — enacted.** 18 U.S.C. §2511 contains a party/prior-consent exception for interception under federal law, subject to statutory qualifications. citeturn10view2

**Critical limitation:** candidates may sit outside New York. A NYC event location does not make New York recording law the only potentially applicable regime. Multi-state rollout requires counsel to determine applicable recording and privacy rules rather than assuming New York's consent model governs every candidate.

**New York data security — enacted.** The SHIELD Act's §899-bb requires reasonable safeguards for businesses holding covered private information and describes administrative, technical, physical, service-provider, testing, and disposal safeguards. citeturn10view1

**Accessibility — technical standard plus employment-law implications.** WCAG 2.2 is a W3C Recommendation dated December 12, 2024; the W3C recommends it as the current WCAG target. ADA employment obligations are a separate legal question, but WCAG 2.2 is a strong engineering baseline. citeturn12search1turn5search5

**Biometrics:** the recommended MVP does not need to derive biometric identifiers. ClaimProof's local policy already prohibits personality, emotion, accent, tone, disability, and other behavioral inference. The safest design is to **never create a voiceprint or facial/behavioral template at all**. This review did not establish that a particular NY biometric statute governs the proposed audio-only ClaimProof flow; counsel should revisit the issue only if voice identification, speaker verification, face geometry, or comparable processing is introduced.

**Electronic signature:** this review does not establish that a typed name is necessary for ClaimProof or that it establishes legally sufficient consent in every jurisdiction. Treat the typed name as an acknowledgment mechanism pending counsel, not as the reason collection becomes permissible.

## Prototype, usability, and demo plan

### Smallest reversible prototype

The MVP should intentionally prove ClaimProof's distinctive idea **without proving screen surveillance can be built**.

Build only:

1. seeded application containing three structured claims;
2. candidate focus-area preview with source/extraction flag;
3. recording/participation notice;
4. voice/text switch;
5. three source-linked questions;
6. one deterministic or LLM-generated adaptive follow-up;
7. transcript lineage and correction/clarification UI;
8. optional explicit artifact attachment;
9. three bounded completion statuses;
10. recruiter claim-by-claim evidence notebook.

Make every external dependency replaceable by fixture data.

The experimental Screen Capture API branch should live behind a non-production developer toggle and **should not feed the report**. Its sole purpose is testing the browser assumptions.

### Twenty-minute candidate usability session

Use the actual 15-minute interaction inside a 20-minute study:

| Time | Activity |
|---|---|
| 0–1 min | "Use this as if you had just applied for a job." No additional explanation |
| 1–16 min | Full candidate journey |
| 16–20 min | Comprehension and reaction questions |

Minimum pass criteria for the MVP:

| Measure | Pass threshold |
|---|---|
| Understands purpose as adding claim context, not proving honesty | 5/5 formative participants |
| Can identify which three application claims are in scope | ≥4/5 |
| Understands whether microphone is recorded before Start | 5/5 |
| Can choose text without asking facilitator | 5/5 |
| Believes text is an equal path | ≥4/5 |
| Understands "unresolved" does not mean "false" | ≥4/5 |
| Understands "demonstrated" does not mean "we proved you are honest" | ≥4/5 |
| Can find source/extraction-error flag | ≥4/5 |
| Can distinguish transcript correction from added clarification | ≥4/5 |
| Completes without facilitator rescue | ≥4/5 |
| Reports unexpected data collection | **0 participants** |
| Thinks system analyzes tone/accent/emotion | **0 participants** |

Five-person testing is formative, not statistically representative. Any fairness or selection-validity claim requires a substantially different study.

For the experimental whole-display branch, add:

> "What exactly do you think ClaimProof can see right now?"  
> "Do you think this proves you did not use another device?"  
> "Would saying no affect your chances?"  
> "What private information were you worried might appear?"

**Fail the feature** if participants routinely overestimate its ability to establish honesty, identity, independence, or completeness.

### Cross-browser engineering matrix

Run the following on currently supported stable releases available to the team:

| Platform | Chrome | Firefox | Safari |
|---|---:|---:|---:|
| Windows 11 | Required | Required | N/A |
| Current macOS | Required | Required | Required |

For the accepted no-screen MVP, test:

* microphone allow/deny/revoke;
* no microphone device;
* voice → text transition;
* transcription timeout/error;
* LLM timeout/error;
* refresh/reconnect;
* network interruption;
* low bandwidth;
* duplicate submission;
* keyboard-only;
* screen reader on at least NVDA/Windows and VoiceOver/macOS;
* 200% zoom/reflow;
* candidate stops midway;
* artifact upload failure;
* transcript correction and clarification lineage.

For the experimental screen branch, test separately:

`monitor / window / browser-tab selection`  
`wrong-surface selection`  
`candidate cancels picker`  
`candidate stops using browser UI`  
`source disappears`  
`browser loses OS-level permission`  
`multiple monitors`  
`logical/aggregated displays`  
`minimized/occluded source`  
`current-tab recursive capture`  
`notification arrival`  
`system audio offered/not offered`  
`capture restart`

Pass criteria:

**No unhandled permission state.**  
**No infinite reprompt.**  
**Capture stop detected and recorder terminates promptly.**  
**UI never claims "entire computer captured."**  
**App correctly records reported surface type where available.**  
**Unknown browser behavior fails open to the no-screen interview, not closed to candidate participation.**  
**No assessment status depends on whether display capture succeeded.**

### Demo narrative

A memorable 90–120 second demo should make **traceability**, not surveillance, the visual payoff.

**0–15 seconds — application becomes claims**

Show a résumé/application transforming into three calm notebook cards.

Narration:

> "A résumé is full of claims, but a recruiter usually has to choose between trusting the document or asking a generic interview question. ClaimProof keeps the connection."

**15–30 seconds — candidate sees the same evidence boundary**

Show:

> Claim: "Reduced onboarding time by 40%"  
> Source: Acme Corp experience  
> Why we're asking: "Understand the measurement and your contribution."

Narration:

> "The candidate always sees what claim a question came from and why it was asked."

**30–55 seconds — answer plus one meaningful follow-up**

Candidate answers by voice. Transcript appears.

> "We tracked median time from account creation to first production deployment..."

Adaptive follow-up:

> "What record did the team use to calculate the before-and-after times?"

Narration:

> "We ask for evidence, not behavioral signals. No camera. No emotion scoring. No honesty detector."

That line is far more distinctive than showing an invasive desktop recording.

**55–75 seconds — artifact as intentional evidence**

Candidate clicks:

> `Add supporting artifact`

Shows one sanitized project dashboard or repository excerpt.

Narration:

> "When an artifact matters, the candidate chooses the evidence to share instead of exposing an entire computer."

**75–95 seconds — evidence notebook**

Recruiter view:

```text
Claim
"Reduced onboarding time by 40%"

Source
Resume · Acme Corp

Question
How was the improvement measured?

Evidence
Median deployment-time comparison
Candidate contribution described
Optional artifact linked

Status
Partially demonstrated
```

**95–110 seconds — limitation**

Show candidate completion status:

> **Partially demonstrated**
>
> "This describes the evidence available in this interview. It is not an honesty or hiring judgment."

Narration:

> "ClaimProof doesn't tell a recruiter who is honest. It shows exactly what evidence supports each claim—and what remains unresolved."

**110–120 seconds — deterministic resilience**

Briefly disconnect LLM/transcription in the demo and show:

> `Adaptive service unavailable — continuing with the prepared claim-linked follow-up.`

Narration:

> "And the core interview still works when an AI or sponsor service doesn't."

That is technically credible, differentiated, and avoids "surveillance theater."

## Decision register, implementation implications, and revisit triggers

### Supported and challenged assumptions

| Assumption | Finding | Evidence class | Action |
|---|---|---|---|
| Signed consent makes mandatory screen capture voluntary | **Not established; reject as product assumption** | UX/ethical judgment; legal counsel required | Require meaningful alternative before using "voluntary" |
| Whole-display capture adds enough evidence to justify risk | **Unsupported today** | Weak / experiment required | Use D/E; run ablation study if reconsidered |
| Browser can require one monitor | **False as stated** | Externally supported | Browser can hint/check type, not choose exact physical display |
| Browser can verify no other monitor/device exists | **False** | Externally supported + inference | Never make this trust claim |
| Screen proves provenance/authorship/honesty | **False/overstated** | Engineering inference | Do not use such language |
| Screen capture permission can be persisted | **No** | Externally supported | Expect fresh user action/permission |
| Typed name replaces browser permission | **No** | Externally supported architecture | Keep consent and browser picker distinct |
| Immediate statuses improve transparency | **Plausible, not proven for ClaimProof** | Experiment required | Test comprehension/dispute |
| Voice-first + text fallback is fair | **Conditional** | External accessibility guidance + experiment | No modality-derived assessment; accommodations |
| Generic AI interview is adequate fallback | **Reject** | Product fit | Preserve claim graph even with deterministic logic |
| Screen capture is necessary for demo distinctiveness | **Reject** | Product judgment | Demo traceability + bounded artifact instead |

### Owner decisions still unresolved

Before any production pilot, ClaimProof needs explicit owner decisions on:

**Retention:** separate policy for raw audio, transcript, artifacts, and evidence report.

**Deletion:** candidate-request mechanism, employer/legal-hold interaction, service-provider deletion.

**Raw-audio access:** whether recruiters can ever play original audio or only authorized review/support personnel.

**Non-consent treatment:** explicit guarantee concerning voice/text and any future display choice.

**Accommodation route:** human contact, response SLA, timing modifications, alternative assessment path.

**Jurisdictional rollout:** candidate location determination and supported jurisdictions.

**AEDT role:** whether ClaimProof's status materially drives or merely informs recruiting decisions.

**Appeal/correction:** what happens when candidate disputes the evidence status rather than merely a transcript error.

**Artifact rules:** allowed types, malware scanning, employer-confidential information warning, third-party information.

**Candidate status timing:** immediate display remains a reasonable MVP hypothesis, but user testing must establish that candidates understand its bounded meaning.

### Revisit triggers

Re-open this decision when any of these occur:

* W3C Screen Capture reaches a materially different Recommendation/state or changes source-selection semantics.
* Chrome, Firefox, or Safari materially change display-picker/source-verification APIs.
* ClaimProof proposes using display behavior, speech characteristics, identity verification, biometrics, or anti-cheating inference.
* ClaimProof expands outside the initially reviewed jurisdiction.
* NYC AEDT rules or federal/state AI-employment regulation changes.
* recruiters demonstrate a specific unanswered evidence need that transcript + intentional artifact cannot satisfy.
* candidate testing shows the statuses are commonly interpreted as honesty/truth scores.
* an incident, security review, or red-team exercise reveals unexpected sensitive-data capture.
* empirical testing demonstrates a genuine incremental benefit from a bounded work sample or screen interaction.

### Freshness and limitations

Technical Screen Capture conclusions rely principally on the **August 27, 2026 W3C Working Draft**, Chrome's platform documentation, and MDN updated **September 7, 2026**. citeturn1search23turn1search9turn3view4

The NYC AEDT rule remains shown by NYC's official rules system as adopted and effective **July 5, 2023** as of this report's September 19, 2026 access date. citeturn7search0

This review did **not** obtain sufficiently detailed current first-party Safari documentation to certify 2026 Safari behavior for all advanced `getDisplayMedia` preference fields, nor equivalent current Firefox documentation for every Chrome-specific option. Those are prototype-test questions, not safe assumptions.

This review also did not retrieve enough high-quality full-text research to quantify the applicant-reaction effect of mandatory whole-screen monitoring in hiring specifically. Applicant-reaction claims concerning ClaimProof should therefore be experimentally validated rather than presented as settled research. citeturn12search0turn12search5

The federal/NY/NYC legal material identifies obvious issue areas; it is not a fifty-state recording/privacy analysis and should not be used to launch nationally without counsel.

### Compact evidence packet

```yaml
research_freshness: "2026-09-19"
authorization: "Unreviewed research material; does not authorize implementation, legal conclusions, product claims, biometric/behavioral analysis, or hiring decisions."

claims:

  - claim_id: CP-SCREEN-001
    claim: "getDisplayMedia must let the end user choose the display surface each time; ordinary media constraints cannot narrow the picker to a particular source."
    evidence_class: "official technical specification"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes Option A as a reliably enforceable browser-level monitor requirement"
    limitations: "W3C Working Draft, not final Recommendation; implementation details can diverge."
    local_validation_needed: "Yes — test all supported browsers/OS combinations."

  - claim_id: CP-SCREEN-002
    claim: "A site may use displaySurface as a preference, but this does not limit end-user selection; the specification recommends steering users away from monitor sharing because of privacy risk."
    evidence_class: "official technical specification"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes mandatory entire-display default"
    limitations: "Normative/browser behavior must still be tested locally."
    local_validation_needed: "Yes."

  - claim_id: CP-SCREEN-003
    claim: "The selected display-surface type can be exposed through MediaTrackSettings.displaySurface as monitor, window, or browser."
    evidence_class: "official technical specification"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "supports post-selection type checking but not exact-source verification"
    limitations: "Implementation support and returned behavior require browser testing."
    local_validation_needed: "Yes."

  - claim_id: CP-SCREEN-004
    claim: "Display-capture sources cannot be enumerated with enumerateDevices and cannot be selected using deviceId."
    evidence_class: "official technical specification"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes claims that ClaimProof can identify and force a specific physical monitor"
    limitations: "Browser-specific labels or nonstandard behavior must not be treated as a stable identity mechanism."
    local_validation_needed: "No for architecture; yes for implementation."

  - claim_id: CP-SCREEN-005
    claim: "A monitor display surface can represent a physical display or a collection of physical displays."
    evidence_class: "official technical specification"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes product language promising capture of exactly one physical monitor"
    limitations: "Actual aggregation behavior is operating-system/browser dependent."
    local_validation_needed: "Yes."

  - claim_id: CP-SCREEN-006
    claim: "Granted getDisplayMedia permission cannot be persisted; transient user activation and repeated user-mediated selection are part of the security model."
    evidence_class: "official technical specification"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes treating a ClaimProof signature as a replacement for browser permission"
    limitations: "OS-level permissions may add additional prompts/settings."
    local_validation_needed: "Yes."

  - claim_id: CP-SCREEN-007
    claim: "Chrome exposes privacy-oriented display-capture preferences including displaySurface, monitorTypeSurfaces, surfaceSwitching, selfBrowserSurface, and systemAudio; it does not let a normal web app preselect a specific screen or window."
    evidence_class: "official browser documentation"
    status: "externally supported"
    canonical_url: "https://developer.chrome.com/docs/web-platform/screen-sharing-controls"
    publication_or_update_date: "date not captured in retrieved page"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes Option A as a portable exact-monitor requirement; supports an experimental Chrome test branch"
    limitations: "Chrome-specific; do not infer Firefox/Safari parity."
    local_validation_needed: "Yes."

  - claim_id: CP-SCREEN-008
    claim: "Display capture creates significant privacy risk from unintentionally sharing content the user did not intend to share."
    evidence_class: "official technical specification and browser documentation"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "strongly opposes mandatory whole-display capture where narrower evidence is available"
    limitations: "Magnitude in ClaimProof population is experiment-required."
    local_validation_needed: "Security review and candidate testing."

  - claim_id: CP-SCREEN-009
    claim: "Whole-display capture does not prove identity, authorship, honesty, competence, or absence of off-screen assistance."
    evidence_class: "engineering inference from capture boundary"
    status: "engineering inference"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes using screen recording as an honesty/provenance guarantee"
    limitations: "Could contribute contextual evidence in a specifically designed work sample; does not establish the broader propositions."
    local_validation_needed: "Any incremental-evidence claim requires an ablation/validity study."

  - claim_id: CP-A11Y-001
    claim: "WCAG 2.2 is a W3C Recommendation and includes requirements relevant to keyboard accessibility, timing, labels/instructions, error handling, status messages, and accessible authentication."
    evidence_class: "official accessibility standard"
    status: "externally supported"
    canonical_url: "https://www.w3.org/TR/WCAG22/"
    publication_or_update_date: "2024-12-12"
    access_date: "2026-09-19"
    supports_or_opposes: "supports voice plus genuinely equivalent text fallback and accessible end-to-end flow"
    limitations: "WCAG compliance does not by itself resolve employment-law compliance or every disability need."
    local_validation_needed: "Accessibility audit and assistive-technology testing."

  - claim_id: CP-EEO-001
    claim: "EEOC and DOJ have warned that employers' use of AI/software assessment tools can violate the ADA by disadvantaging applicants with disabilities."
    evidence_class: "official federal enforcement guidance"
    status: "externally supported"
    canonical_url: "https://www.eeoc.gov/newsroom/us-eeoc-and-us-department-justice-warn-against-disability-discrimination"
    publication_or_update_date: "2022-05-12"
    access_date: "2026-09-19"
    supports_or_opposes: "supports accommodations, modality alternatives, and avoiding disability-related inference"
    limitations: "Application to ClaimProof's exact design is a legal question."
    local_validation_needed: "Legal counsel and accessibility testing."

  - claim_id: CP-EEO-002
    claim: "Federal employment-discrimination analysis can apply when automated systems make or inform selection decisions, including analysis of adverse impact."
    evidence_class: "official EEOC material"
    status: "externally supported"
    canonical_url: "https://www.eeoc.gov/2023-annual-performance-report"
    publication_or_update_date: "2023"
    access_date: "2026-09-19"
    supports_or_opposes: "supports monitoring selection effects and keeping ClaimProof outputs explainable"
    limitations: "The product's exact employer/vendor responsibilities require counsel."
    local_validation_needed: "Legal review and outcome monitoring before production selection use."

  - claim_id: CP-NYC-001
    claim: "NYC's Automated Employment Decision Tools rule is listed by the City as adopted and effective July 5, 2023."
    evidence_class: "official NYC rulemaking source"
    status: "externally supported"
    canonical_url: "https://rules.cityofnewyork.us/rule/automated-employment-decision-tools-updated/"
    publication_or_update_date: "effective 2023-07-05"
    access_date: "2026-09-19"
    supports_or_opposes: "requires counsel to determine whether ClaimProof's actual use qualifies as an AEDT"
    limitations: "Coverage depends on functionality and use in employment decision-making; this report makes no coverage conclusion."
    local_validation_needed: "NYC employment counsel."

  - claim_id: CP-NY-REC-001
    claim: "New York Penal Law §250.00 defines wiretapping/mechanical overhearing using consent concepts that include consent of a sender/receiver or at least one party."
    evidence_class: "official New York statute"
    status: "externally supported"
    canonical_url: "https://www.nysenate.gov/legislation/laws/PEN/250.00"
    publication_or_update_date: "most recent revision shown: 2014-09-22"
    access_date: "2026-09-19"
    supports_or_opposes: "supports explicit recording notice but does not justify nationwide one-party-consent assumptions"
    limitations: "Candidate location and other jurisdictions may change applicable recording law."
    local_validation_needed: "Multi-jurisdiction counsel."

  - claim_id: CP-FED-REC-001
    claim: "18 U.S.C. §2511 contains an exception where the interceptor is a party or one party has given prior consent, subject to statutory qualifications."
    evidence_class: "federal statute"
    status: "externally supported"
    canonical_url: "https://www.law.cornell.edu/uscode/text/18/2511"
    publication_or_update_date: "current U.S. Code version accessed 2026-09-19"
    access_date: "2026-09-19"
    supports_or_opposes: "supports obtaining explicit recording consent but does not settle stricter state-law requirements"
    limitations: "Not a fifty-state recording-law analysis."
    local_validation_needed: "Counsel."

  - claim_id: CP-NY-SEC-001
    claim: "New York General Business Law §899-bb requires reasonable administrative, technical, and physical safeguards for covered computerized private information and addresses secure disposal."
    evidence_class: "official New York statute"
    status: "externally supported"
    canonical_url: "https://www.nysenate.gov/legislation/laws/GBS/899-BB"
    publication_or_update_date: "most recent revision shown: 2020-03-27"
    access_date: "2026-09-19"
    supports_or_opposes: "supports minimization, security review, service-provider controls, and deletion architecture"
    limitations: "Whether each ClaimProof data element is statutory private information is fact-specific."
    local_validation_needed: "Security review and counsel."

  - claim_id: CP-REACTION-001
    claim: "Peer-reviewed research treats applicant reactions to AI-mediated/video selection as a procedural-justice and acceptance issue distinct from predictive validity."
    evidence_class: "peer-reviewed research, limited retrieval"
    status: "externally supported but scope-limited"
    canonical_url: "https://www.sciencedirect.com/science/article/pii/S0747563221002545"
    publication_or_update_date: "publication date not captured in retrieved result"
    access_date: "2026-09-19"
    supports_or_opposes: "supports testing candidate understanding/acceptance rather than assuming monitoring increases trust"
    limitations: "Not specifically a study of mandatory whole-desktop recording in ClaimProof-like employment interviews."
    local_validation_needed: "Yes — ClaimProof usability/reaction study."

  - claim_id: CP-REACTION-002
    claim: "The evidence retrieved in this review does not establish that mandatory entire-display recording improves predictive validity or job-relatedness."
    evidence_class: "evidence-gap finding"
    status: "weak / unresolved"
    canonical_url: "https://www.sciencedirect.com/science/article/pii/S2451958825001289"
    publication_or_update_date: "2025"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes treating screen capture as validated selection evidence"
    limitations: "Absence in this review is not proof no relevant study exists."
    local_validation_needed: "Literature update plus criterion-related/incremental-validity research before any selection claim."

  - claim_id: CP-CONSENT-001
    claim: "A typed-name acknowledgment does not, by itself, resolve whether a mandatory employment-context recording choice is meaningfully voluntary."
    evidence_class: "ethical/UX analysis; legal interpretation deferred"
    status: "legal interpretation requiring counsel"
    canonical_url: "https://www.nysenate.gov/legislation/laws/PEN/250.00"
    publication_or_update_date: "statute revision shown: 2014-09-22"
    access_date: "2026-09-19"
    supports_or_opposes: "opposes relying on signature alone to justify Option A"
    limitations: "This packet does not make a legal finding concerning electronic-signature sufficiency."
    local_validation_needed: "Employment/privacy counsel plus candidate comprehension testing."

  - claim_id: CP-DECISION-001
    claim: "For the hackathon MVP, no-screen claim lineage plus intentional artifacts is safer, more reversible, and more accurately described than mandatory whole-display recording."
    evidence_class: "synthesis / product decision"
    status: "supported recommendation"
    canonical_url: "https://www.w3.org/TR/screen-capture/"
    publication_or_update_date: "2026-08-27"
    access_date: "2026-09-19"
    supports_or_opposes: "supports Option D as baseline and Option E as enhancement; rejects A for MVP"
    limitations: "Recruiter usefulness and candidate understanding still require prototype observation."
    local_validation_needed: "Usability test, recruiter review, accessibility test, security review, and legal review."
```

**Bottom-line decision:** ClaimProof's strongest trust mechanism is **visible evidence lineage**, not invisible surveillance. For the September 19, 2026 hackathon, mandatory whole-display recording should be **cut**. Build Option D, demonstrate Option E when a job-relevant artifact helps, keep any display-capture work isolated as an engineering experiment, and do not revisit mandatory capture until incremental evidence value, consent/accommodation, browser reliability, security, and legal review all clear substantially higher bars.
