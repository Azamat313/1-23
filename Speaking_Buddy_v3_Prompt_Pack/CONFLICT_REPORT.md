# Conflict report: Speaking Buddy v3.1 prompt pack

This is not a runtime file, so do not load it into the prompt. The runtime pack is the other 11 files in this folder, still labelled v3.1.

## Method

I cross-checked every value shared between files: event names, learner states, persona IDs, languages, comfort values, consent fields, emotion palettes, correction units and budgets. Then I checked each of the 36 persona examples against the core rules and its persona's emotion palette. For the 24 examples that state a level, I also checked the reply against that level's sentence and word budget. Where two files disagreed, the fix follows the core's own precedence (core over persona examples). The core itself was edited only where it was the inconsistent side.

## Contradictions fixed

| # | Where | Conflict | Fix |
|---|---|---|---|
| 1 | Luna and Aizere examples | "trusted pause event" is not an event. The core (§3, §10) and the template list eight events, and an unknown event produces no output, so these examples could never fire. | Context is now `SILENCE_60S with learner_state=paused`. While paused, the core allows SILENCE_60S to speak. |
| 2 | Spark, Voice | "Use no routine profanity" implies that occasional profanity is fine. Core §11 is the only profanity policy, and with `profanity_supported: false` all profanity is off. | "Use no profanity: Spark's profanity_supported is false." |
| 3 | Spark, Voice | "Do not sprinkle … Russian memes into every reply" allows them occasionally. Core §5 says `english_only` covers jokes, a persona's identity cannot add flavour language, and the support language is only for help. | No Russian memes or flavour words; Russian only for support that the core permits. "Bruh", "Pff" and "no cap" now fall under Spark's existing slang limits. |
| 4 | Dexter, `[angry]` example | The example was a "B2 opinion task". At B2, a course or scenario task runs inside a role card, and Dexter's own rule says anger inside a role needs a card that calls for restrained anger. The example had no such card. | The example is now a B2 free-chat debate with no active role. The angry rule now says the challenge must fit "the task or conversation". |
| 5 | Core §11 vs template | The core cleared a pending consent question only on an unambiguous answer or a topic change. The template cleared it on any response. After an ambiguous reply, the two files disagreed on the state. | Both files now say the learner's next final turn clears pending status. Only an unambiguous yes or no changes consent; anything else leaves it unchanged, with no follow-up question. |
| 6 | Core §11 | The consent question could be asked under `comfort=gentle`, which the same section says suspends profanity. | Added "comfort other than gentle with no active request to soften" to the preconditions. |
| 7 | Core §1 vs §3 | The priority list ranks safety above runtime state. §3 says eligibility is checked before any content, and a missing state means silence. | §1 now says that §3 eligibility decides whether a reply may be spoken, and the priority order decides what an eligible reply does. This matches the stated intent of §3 ("Determine eligibility before choosing content"). |
| 8 | Luna example | "With 'she', add 's'" is wrong for this verb ("go" becomes "goes", not "gos"). The core also says not to apply form rules mechanically. | "With 'she', 'go' becomes 'goes'." |

## Loopholes and misalignments fixed

| # | Where | Issue | Fix |
|---|---|---|---|
| 9 | Spark, Emotions | "Never perform anger … at the learner" left anger at anything else open. Core §13 allows an angry performance only under a persona's stated conditions, and Spark has no angry tag. | "Never perform anger, fury or boredom: none is in Spark's palette." |
| 10 | Aizere, Voice | Kazakh slang and proverbs, described as "optional expressive material", had no level limit (A0 bans slang and idioms) and no link to the core's support-language triggers. | Allowed only inside a Kazakh support turn that the core already permits, and never at A0–A1, matching Dexter and Spark. |
| 11 | Aizere, Voice | When a learner asked for Russian, Aizere only pointed to another buddy. Core §5 says to keep helping in simpler English and to mention the setting only when necessary. | Aizere keeps helping in simpler English, then mentions the Russian-support buddy when necessary. |
| 12 | Core §2 vs Aizere | "Use neutral address" clashed with Aizere's Kazakh polite and informal forms. Aizere herself uses "address-neutral" to mean avoiding a direct form. The core's intent, which Dexter and Aizere mirror, is no gendered terms or nicknames. | "Use gender-neutral address without nicknames or endearments…" |
| 13 | Core §2 vs §3 and template | The trusted-context list left out `learner_state` and `latest_input`, although §3 depends on both and the template supplies them. | Added both fields, plus the session ID. |
| 14 | Spark example | After "the jokes are annoying", Spark reset the topic ("What would you like to talk about?"). In course or scenario mode, that abandons the task. The request is only a style change (core §4, §11). | Spark acknowledges once and continues: "Got it—fewer jokes. So what happened next?" |
| 15 | Spark examples | Two examples said "trusted silence nudge" and "trusted session end" instead of the core's event names. | `SILENCE_30S` and `SESSION_END`. |
| 16 | Template vs core §10 | The core suppresses silence events on an unreliable connection, but the template, which is the application's spec, did not. | Added "or while the connection is unreliable". |

## Checked and left unchanged

- Every level profile defines `active_vocabulary_max` and `optional_vocabulary_max`, but no rule in the core uses them. It is not clear whether they apply per turn, per task or per session. That is a product decision, so I did not invent an answer.
- B2's feedback budget (3 sentences, 50 words) is smaller than its normal budget (3 sentences, 60 words), unlike A0–B1. It matches B2's "one useful fix" rule, so it looks intentional.
- Version labels are still v3.1. If fixed and unfixed files could be mixed in deployment, change every header and the core's assembly line to v3.2 together, so that the "all from the same version" rule catches a stale file.
