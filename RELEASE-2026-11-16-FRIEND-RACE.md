# Friend ticket races

Free for all accounts; no payment check. The host may challenge only their own invitees, verified through the existing immutable invite_arrivals relation. Both accounts must have completed one task or ticket. The existing referral bonus requirements (first road story plus a return on a different day) do not gate racing.

Both players receive the same randomly selected existing 20-question ticket and order. The shared server timestamp starts a three-second countdown only after both join and confirm readiness. Server-validated first answers are saved independently; neither player receives answer correctness during the race. After both finish, fewer errors wins, then server-measured elapsed time; exact equality is a draw. Results and existing explanations are available for review. Extra REP/CR or paid products are not introduced.

Rooms and per-player reservations are stored privately and accessed only through the existing Telegram-authenticated API. The RPC is invoker-only and callable only by service_role; anon/authenticated cannot query the tables or invoke race functions. A revision check prevents concurrent readiness/answer overwrites. Third parties cannot load or join a known room. Each user can have only one unfinished race; rooms expire after 30 minutes and can be cancelled without declaring a winner. A host can create at most 30 rooms per hour.

The client reuses all original avatar frames, canvas renderer, font, cream palette, ink-blue buttons and game rooms. Friend invitation sharing is initiated manually by the user; no messages are sent by the assistant or server.

Validation: 49 Node tests passed, including 15 race engine/API checks and the previous 34 regression checks. Local browser testing with two isolated test players covered invitee choice, waiting, join, readiness, shared countdown, matching first question, all 20 answers from both players, reload at question 11, delayed second finish, winner/results, review, result reload, another race, and inline cancellation. At 320px no horizontal overflow was observed. The final fresh browser tab logged no warnings or errors. Database migration and production verification status are recorded separately in output/friend-race/verification.json.

Run: node --test server/drive98/*.test.mjs
Local isolated preview: node tools/preview-race.mjs; open http://127.0.0.1:8879/?player=host and ?player=guest.
