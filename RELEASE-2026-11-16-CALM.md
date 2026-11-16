# Parking without fuss

Nine free sequential tasks: three preparation questions, three existing illustrated road situations with their explanations, then a two-place plan, approach preparation and a self-reported parking attempt review. Completing each task opens the next; all three tasks in a stage must be completed to open the next stage. Incorrect quiz choices are preserved but can complete after reviewing the explanation. Unfinished practice can be deferred without losing prior preparation.

Progress and first answers are stored in the existing revision-checked player JSON. No migration or payment is required. Completed tasks emit the existing task-completion signal so they qualify as started play for friend races and participate in the existing activity-day accounting. Quiz completion restores up to half a clarity point once per task, bounded at four. No direct REP or CR rewards are added.

The one-time completion reward is an original code-native pixel plant added to pet.roomItems and rendered in the companion room. Character frames, avatar layers, font and colors are reused unchanged. The introduction diagram is a fictional two-place choice with explicitly given permission for both bays; later road questions and explanations reuse the existing catalog. Preparation and trip records are private player notes. Practice completion is self-reported and is not evidence of driving competence.

Validation: 67 Node tests passed, including 18 new progression tests. Local browser covered all nine tasks, an incorrect answer followed by review, progression gates, reload, preparation, deferral, unsuccessful reported attempt, completion, room plant and the complete task list; no browser errors/warnings. The block has no horizontal overflow at 320px. The actual drive98_load/drive98_commit functions passed a rollback-only database roundtrip preserving all nine completions and the room plant; repeated request did not overwrite progress, and completion satisfied the friend-mode activity gate. Zero synthetic players remained. A personal production Telegram playthrough is not part of this verification.

Run: node --test server/drive98/*.test.mjs
Local isolated preview: DAILY_PREVIEW_PORT=8883 node tools/preview-daily.mjs
