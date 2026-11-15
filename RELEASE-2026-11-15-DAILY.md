# Daily task

Adds a pinned daily road situation to the companion home screen. Server actions preserve the first answer, resume questions/reviews, award at most one clarity point per assignment, and schedule repetitions after 1 day for errors or 3/7/14 days for correct reviews. Moscow midnight advances the assignment day. Unfinished older assignments remain available and complete against their original day. Practice updates repetition knowledge without another clarity reward or daily completion.

Eight situations use existing road artwork, options, source explanations and source links. No avatar artwork, palette, renderer or font files changed. Existing character frames supply interest, support, joy and pride. The compact home room uses the existing room artwork and controls. Daily statistics and repetition entry are available in My Progress; PDD statistics remain separate.

Server state extends the existing player JSON; no migration is needed. All daily events go through the existing authenticated API, request receipts, revision checks and transactionally locked drive98_commit. Correct answer, explanation and takeaway are omitted from the daily public payload before an answer. There are no new REP, CR or payment changes.

Validation: 32 Node tests passed (15 daily, 10 pet, 7 care feedback). Browser checked at 390×844 and 320×740: first start, correct/wrong answers, reload during question and review, completion, review replay, practice entry and daily/PDD progress separation. At 320px no horizontal overflow was observed. Browser error/warning log empty in the checked local flow. Full personal Telegram authentication and production reward flow require verification in Telegram; local browser checks use an isolated preview adapter, never a real user profile.

Run tests: node --test server/drive98/daily-core.test.mjs server/drive98/pet-core.test.mjs server/drive98/care-feedback.test.mjs
Local preview from project root: node tools/preview-daily.mjs (127.0.0.1:8878).
