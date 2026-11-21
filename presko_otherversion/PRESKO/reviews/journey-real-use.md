# Presko in real use: customer journey trace and fixes

Reviewer: customer-journey agent (UX/UI). Inputs: the built app (`app/ui.js`, `store.js`, `selectors.js`, `messages.js`, `index.html`), `WEBAPP-PLAN.md` v4, and `reviews/design-final.md` (FINAL, including the §14 binding notes).

This review is about real use, not the 2-minute demo. Each role is traced through a real week. Gaps are listed where the prototype lacks something or gets it wrong. Fixes are prioritised **P0** (build now, about 45 min in total), **P1** (next) and **P2** (later). Every fix keeps the store's permission model, with the role kinds `coordinator`, `sdo`, `head`, `teacher` and `custodian`.

---

## 0. The biggest finding: the URL decides who you are

The prototype currently lets **the URL pick the role**:
- `renderInner()` calls `setRole("coordinator")` whenever someone opens an `#admin…` page in school mode.
- It calls `setRole("head", Pandac or the slug's school)` whenever an admin opens a `#school-…` page.
- `schoolPage()` silently moves a school role to whichever school's slug is in the link. A Pandac head who opens Jibao-an's link *becomes Jibao-an's head* and can record its decision.
- Anyone can reach the role picker (the header `Role ▾` select and ⇄) from any screen.

The store's permission checks (`need()`) are correct, but these UI auto-switches bypass them. In real use, someone forwards the wrong school link in a group chat and a decision lands on the wrong school. **This is why sign-in is P0, not a nicety:** the account fixes the role and the school, and the URL only navigates.

---

## 1. Sign-in design (P0)

### 1.1 Accounts
New file `app/accounts.js`, imported by the store:

```js
export const DEMO_DOMAIN = "presko.demo";      // .demo is not a real public domain; nothing here imitates DepEd or SDO branding
export const ACCOUNTS = [
  { id: "coord",    email: "coordinator@presko.demo",     pin: "1111", kind: "coordinator", name: "Demo Coordinator" },
  { id: "sdo",      email: "approver@presko.demo",        pin: "2222", kind: "sdo",         name: "Demo Approver" },
  { id: "head-pan", email: "head.pandac@presko.demo",     pin: "3333", kind: "head",      name: "Demo Head (Pandac)",   school: "Pandac Elementary School" },
  { id: "head-jib", email: "head.jibaoan@presko.demo",    pin: "4444", kind: "head",      name: "Demo Head (Jibao-an)", school: "Jibao-an Elementary School" },
  { id: "tch-pan",  email: "teacher.pandac@presko.demo",  pin: "5555", kind: "teacher",   name: "Demo Teacher (Pandac)", school: "Pandac Elementary School" },
  { id: "cus-pan",  email: "custodian.pandac@presko.demo",pin: "6666", kind: "custodian", name: "Demo Custodian (Pandac)", school: "Pandac Elementary School" },
];
```
- Each account maps to exactly one role kind and, for school kinds, exactly one school (resolved to `schoolId` by name at sign-in).
- Use **fictional "Demo …" names**, not realistic Filipino names with titles like "Dr. Reyes (SDS)", which could be read as a real official. Replace the hard-coded names in `ui.js` (`"Ma. Santos"`, `"Dr. Reyes (SDS)"`, `"R. Dela Cruz (DRRM)"`, …).
- The second head (Jibao-an) exists so the demo and the tests can show the wrong-school case. Jibao-an is also the seeded override, so the SDO return loop can be traced from the head's side.

### 1.2 Store (`app/store.js`)
- `initialState().role` becomes `null` (signed out).
- **New `actions.signIn(email, pin, { remember = true })`:**
  - Case-insensitive email match. On no match, or a wrong PIN, it throws `AuthError("That email and PIN don't match a demo account.")`; the message never says which part was wrong.
  - It sets `state.role = { kind, name, schoolId, accountId }` and writes the session (see below).
  - It returns the account's landing hash (§1.4).
- **New `actions.signOut()`:** sets `role = null`, clears the session key, then commits.
- **Session apart from data:** keep the session in its own key, `presko:session` = `{ accountId, at }`. Use `localStorage` when "Remember me on this phone" is ticked, and `sessionStorage` otherwise. `save()` writes the data blob **without** `role`, and `load()` restores the role from the session key by looking up `accountId` in `ACCOUNTS`. An unknown id means signed out.
- **`need()`:** when `state.role` is null, it throws `PermissionError("Sign in first.")`.
- **`setRole`:** kept only for Node tests (rename or alias `_setRoleForTests`, or leave it in and document it as test-only). The UI never calls it. The existing tests keep passing.
- **Name on decisions:** `recordDecision` already uses `state.role.name` for `by`, so decisions carry the account name automatically.

### 1.3 Sign-in page (`#start`, `ui.js startPage` → `signInPage`)
On phones it is a single column. Contents, top to bottom:
1. The wordmark and the h1 from design §9: "Tomorrow's heat level for 69 schools, decided by 17:00."
2. A line: "Prototype · demo accounts only · no real data is sent anywhere."
3. A form:
   - Email (`type=email`, `autocomplete=username`, 16 px).
   - PIN (`type=password`, `inputmode=numeric`, `autocomplete=current-password`).
   - "Remember me on this phone" checkbox, ticked by default.
   - Ink **Sign in** button.
4. Errors appear in a persistent `role="alert"` banner (design §14 note 1): "That email and PIN don't match a demo account. Check the list below." The PIN field is cleared; the email is kept.
5. **"Demo accounts"** card, in the timeline order from design §9. Each row has a mono time, the role, the school, the email and the PIN in mono, and a secondary **"Sign in"** button that runs the same `signIn()` call. It is a shortcut through the same path, not a bypass:
   - 16:00 · DRRM coordinator · coordinator@presko.demo · 1111
   - 16:30 · School head, Pandac ES · head.pandac@presko.demo · 3333
   - 16:30 · School head, Jibao-an ES · head.jibaoan@presko.demo · 4444
   - 16:45 · SDO approver · approver@presko.demo · 2222
   - 08:00 · Teacher, Pandac ES · teacher.pandac@presko.demo · 5555
   - Week 1 · Custodian, Pandac ES · custodian.pandac@presko.demo · 6666
6. Footnote: "In a pilot, each person would sign in with an account issued by the division. This page is not connected to any DepEd system." Keep the plain styling and the Presko wordmark only. Use no seals, no DepEd blue or red, and no "DepEd" in the title.
7. Links: Demo settings · Classic desk · Data flow.

### 1.4 Landing per role

| Kind | Lands on | Why |
|---|---|---|
| coordinator | `#admin` | Publish and watch |
| sdo | `#admin-decisions-awaiting` | Its only job |
| head | `#school-<own slug>` | Today |
| teacher | `#school-<own slug>-morning` from 05:00 to 12:00, else `#school-<own slug>` (read-only) | Readings happen in the morning |
| custodian | `#school-<own slug>-setup` | Onboarding |

### 1.5 Route guard (replaces every auto `setRole` in `renderInner` and `schoolPage`)
Add `function allowed(r, role)` in `ui.js`:
- `start` and `demo`: always allowed.
- `admin*`: `coordinator` or `sdo`.
- `school-*`: a school kind **and** `bySlug(r.slug).id === role.schoolId`.

In `renderInner()`:
- **Signed out on any page except start/demo:** save the hash in `sessionStorage["presko:next"]` and go to `#start`. The sign-in page shows a banner: "Sign in to open Pandac Elementary School's page." (or "…the division page").
- **After `signIn`:** if `next` exists and is allowed for this account, go there. Otherwise go to the landing page. Clear `next` either way. **This keeps a forwarded school link working.**
- **Signed in, wrong school:** render a stop card. Don't switch roles. The card reads: "This link is for **Jibao-an Elementary School**. You're signed in as Demo Head (Pandac), Pandac Elementary School." It has an ink **"Go to my school"** button and a secondary **"Sign out and use another account"** button.
- **Signed in, school account on an admin page:** "This page is for SDO staff. Your account is for Pandac Elementary School." with **"Go to my school"**.
- **Unknown slug:** "We can't find that school link. It may be mistyped." with **"Go to my page"**. This replaces the bare "Unknown school link."
- **Remove** the role auto-switches in `renderInner` and `schoolPage`.

### 1.6 Header (`renderHeader`)
- The **person's name, role and school** (design §5 context slot), for example "Demo Head (Pandac) · School head · Pandac ES". On phones the name moves to an account button in row 1 with an initials circle (44 px), and the school stays in the page hero, as design §5 says.
- **Account menu:** the person's name, the role and school, "Signed in on this phone since 15:02", and a **Sign out** button. Signing out goes to `#start` with "Signed out." (a toast is fine here, since it confirms something).
- **Remove** the `Role ▾` select. Tabs depend on the role:
  - Coordinator: Division · Decisions · Replay · Rules · Data.
  - SDO: Decisions · Division · Rules.
  - Head: Today · Morning check · Setup.
  - Teacher: Morning check · Today (read-only).
  - Custodian: Setup · Today (read-only).
- **Quick switching for the demo:**
  - Keep the 44 px **⇄** button from design §0 #13, but relabel it **"Demo ⇄ SDO"** / **"Demo ⇄ Pandac head"**, inside the DEMO tag's ring.
  - It calls `signOut()` then `signIn(<demo account>)`, going through the same path, so the header always shows who is acting.
  - It renders only when `DEMO_MODE` is true, a constant in `accounts.js` that defaults to true for this prototype. With `DEMO_MODE = false`, real use has no role switcher.
  - Update the §11 demo script: each "Switch" step stays one tap.
- `document.title` = `Presko · Pandac ES` (school roles) or `Presko · Division` (admin roles), so bookmarks and home-screen icons have useful names.

---

## 2. Journey traces

Each step gives what the person needs, what the prototype does, and the gap (with its fix id).

### 2.1 DRRM coordinator

| When | Needs | Prototype | Gap → fix |
|---|---|---|---|
| First login | To know what Presko does for them and what "Publish" changes | The role card gives a verb phrase only | First-run tip card → **P1-4** |
| 15:00 | Enter PAGASA's afternoon figure as provisional | Draft, Provisional, Publish | The bulletin isn't recorded (time and issue number) → **P2-1** |
| 15:05 | Check the effect before telling 66 schools | Preview (only you) | OK |
| 15:10–16:45 | See who hasn't acted, and nudge them | "Chase missing" with one long reminder listing every name | One message with 40 names gets ignored → per-school reminder lines and a "copy for group chat" version → **P1-6** |
| 17:00 | Publish PAGASA's 5 p.m. advisory as **final** | Finalising at the same value asks nothing; a different value shows the confirm count | OK. But heads who recorded at 16:30 aren't told the forecast is now final → the updates strip → **P1-1** |
| 17:10 | A changed figure after the deadline | Statuses become re-confirm, and later decisions are flagged `late` | Heads are flagged late for something the SDO caused → **P1-7** |
| 17:30 | Close the day: who is done, who is late, the situation report | CSV only | "Day summary" card → **P1-5** |
| Next 07:30 | See today's state and readings arriving | Today/Tomorrow chip defaults to Today before 12:00; readings count shown | Schools with "readings call for X" waiting on the head aren't listed first → sort the chase list: `stale-inputs` first in the morning → **P1-6** |
| Next 13:00 | Start tomorrow | The chip switches to Tomorrow | The draft still holds yesterday's value → pre-fill the draft with the last published value and mark it "from yesterday" → **P2-2** |

### 2.2 SDO approver

| When | Needs | Prototype | Gap → fix |
|---|---|---|---|
| Notified | To know an override is waiting, without staring at a screen | Nothing | Decisions tab badge plus the updates strip; the head gets a "Copy note for the SDO" text → **P1-1**, **P1-2** |
| On a phone | Card rows, one-tap Approve, a required note on return | Built (cards under 700 px) | The note field sits beside Approve, so it reads as needed for both. Label it "Note (required to return, optional to approve)" → **P1-8** |
| After acting | To know the head saw it | Nothing | The head's strip shows "Returned by SDO at 16:52: '…'"; the SDO row shows "seen by head 16:55" (P2: `lastSeen` per account) → **P2-3** |

### 2.3 School head

| When | Needs | Prototype | Gap → fix |
|---|---|---|---|
| First link or account | A link that opens their school after sign-in, and a sense of what is asked of them | The link auto-assigns the head of *whatever school is in it* | **P0-2** (route guard, `next`), first-run card **P1-4** |
| Bookmark | A bookmark that reopens their school | The title is "Presko" | **P0-3** (`document.title`); remembered session **P0-1** |
| 15:30 (no forecast yet) | To know when to come back | "Waiting for the SDO's forecast" | Add "Usually published by 16:00. Open this page again then." → **P1-3** |
| 16:30 decision | Record in one tap | Built | OK |
| Send to parents | Post to Facebook or group chat from a phone | Copy, then mark chips | Add `navigator.share` where available ("Share…") → **P1-9**. Messages have no date → **P0-5** |
| After sending | To know they're done | Chips get ✓ | "Done for tomorrow" line → **P1-10** |
| 17:10 forecast change | To be told, and to correct the message | The correction flow exists, but nothing tells them to come back | The updates strip, the coordinator's re-confirm chase, and no `late` flag for an SDO-caused change → **P1-1**, **P1-7** |
| 08:15 re-confirm | The Today card | Built | OK. The teacher's hand-off text exists |
| A day with no heat (HAYO regular) | Not 66 needless taps every cool day | Status "No decision"; the message stays a draft until they tap Record | **P1-11** |

### 2.4 Teacher at 08:00
- **Signing in:** a shared per-school teacher account, with a remembered session on the school's duty phone (P0-1).
- **Saving readings:** they save on `change` with no confirmation, so the teacher doesn't know whether the readings went in. Add a live line under the buildings: "Saved 08:04 · 2 of 3 buildings read · not read: Building C" (`schoolMorning`, from `v.buildings`) → **P1-12**.
- **No forecast for today:** the page says "nothing to check against". Add "Ask the coordinator; readings can still be noted on paper" → **P1-3**.
- **Hand-off:** "Copy note for the head" exists. Add **Share…** (P1-9).

### 2.5 Custodian, week 1
- **Signing in:** P0-1. The landing page is Setup.
- **Setup is too thin to finish onboarding:**
  - only notes and the timetable are editable;
  - rooms, storeys, building names and sections show but can't be edited;
  - there's no progress indicator.
  - P1-13 adds a progress line, "Setup: 1 of 3 parts entered by the school (buildings, timetable, sections)", using the existing `provenance`. P2-4 covers editing rooms and storeys, add/remove building, and a sections editor, with the `editSetup` action already in place.
- **Feedback after a re-read:** after "Re-read note", the custodian doesn't see what changed for the school. Show "Building A: hot → cooler. On a HINGA day Pandac now has grounds to ask for face-to-face back" (from the view model before and after) → **P1-14**.

### 2.6 A parent receiving the message
- **No date:** the message says "tomorrow" without a date. When forwarded or read the next day, "tomorrow" is wrong, which is exactly how fake "walang pasok" posts spread. → **P0-5** adds the weekday and date.
- **"Verify only on the school's official page":** it doesn't say which page. Add an `officialPage` setup field (the page name, e.g. "Pandac ES official FB page") and put it in the message → **P2-5**.
- **Language:** the default tab is English. Most Iloilo parents read Hiligaynon. Remember the last-used language per account; the default is the head's choice → **P2-6**.
- **Length:** the official text is about 350 characters, fine for FB or Messenger. An SMS version (under 160 characters, no signature line) → **P2-7**.

---

## 3. Fixes by priority

### P0: build now (about 45 min)

| # | Fix | Screen / element | Copy | Behaviour | Code | Min |
|---|---|---|---|---|---|---|
| **P0-1** | Sign-in with demo accounts | `#start` becomes the sign-in page (§1.3) | "That email and PIN don't match a demo account. Check the list below." | Email + PIN form, "Remember me on this phone", one-tap demo account rows that run the same `signIn` | New `app/accounts.js`; `store.js`: `signIn`, `signOut`, `role` null by default, `presko:session` key, role left out of `save()`, `need()` refuses when signed out; `ui.js`: `startPage` → `signInPage` | 15 |
| **P0-2** | Route guard instead of URL-picked roles | `renderInner`, `schoolPage` | "This link is for Jibao-an Elementary School. You're signed in as Demo Head (Pandac)…"; "Sign in to open Pandac Elementary School's page."; "We can't find that school link." | `allowed(r, role)`; signed out → save `presko:next` → sign in → back to the link; wrong school → stop card; school account on admin pages → stop card; **remove all auto `setRole` calls** | `ui.js` only | 10 |
| **P0-3** | Header shows the signed-in person; sign out; no free role picker | `renderHeader` | "Demo Head (Pandac) · School head · Pandac ES"; "Sign out"; "Demo ⇄ SDO" | Remove `Role ▾`; tabs per role (§1.6); the ⇄ button becomes a demo-only account switch (`signOut` + `signIn`) behind `DEMO_MODE`; set `document.title` | `ui.js renderHeader`; `accounts.js DEMO_MODE` | 8 |
| **P0-4** | Landing per role and real names on decisions | After sign-in, `demoPage` reset | — | Landing table (§1.4); replace the hard-coded names in `ui.js` with `ACCOUNTS`; `demoReset` signs in `coord`; the demo seed's `by` becomes "Demo head (seed)" | `ui.js` (`#reset`, switch handlers), `store.js seedDemo` | 5 |
| **P0-5** | Date in every parent message | Message block, correction, morning update | "…for **tomorrow, Mon 23 Nov** (38°C, final)…" / Filipino "bukas, Lun 23 Nob" / Hiligaynon "buwas, Lun 23 Nob"; the morning update uses "today, Tue 24 Nov" | Pass `vm.date` into the templates | `messages.js`: `parentMessage(v, vm, lang, { official, schoolName })` reads `vm.date` and puts a formatted date after the first "tomorrow/bukas/buwas"; `morningMessage`'s regex keeps the date | 5 |
| | **Tests** | — | — | Add to `app.test.mjs`: wrong PIN throws `AuthError`; `signOut` makes `recordDecision` throw "Sign in first."; Pandac head can't record for Jibao-an (already covered by `need`); session restores the role and data blob carries no role; message contains the date | `app.test.mjs` (existing `setRole` helpers stay) | (inside the above) |

Order: P0-1 → P0-2 → P0-3 → P0-4 → P0-5. The demo still runs in about 1:50. Each "Switch" becomes the one-tap "Demo ⇄" button, and a session expiring mid-take isn't possible, because the session has no timeout.

### P1: next

1. **Updates strip (honest fake notifications).** A thin card at the top of each landing page: "Since you last opened (15:02)". It is derived from the store, not pushed. Examples:
   - "Forecast for Mon 23 published 38°C provisional at 15:10, final at 17:00".
   - "Your HINAY request was returned by the SDO at 16:52".
   - "8:00 readings call for HINGA".
   - "3 decisions await you".

   It carries the label "In-app only. A pilot would also send SMS." Code:
   - `selectors.updatesFor(store, role, sinceIso)` lists the events from `forecast.publishedAt`, `decision.sdoAt` and readings.
   - `lastSeen` is kept per account in `presko:session`.
2. **Badges and hand-offs:**
   - Decisions tab badge = the count awaiting the SDO.
   - The head's awaiting state gets "Copy note for the SDO": "Pandac ES asks to use HINAY instead of HINGA tomorrow (reason …). Please review in Presko before 16:45." Add `messages.js sdoNoteText`.
3. **Waiting states with a next time:**
   - School: "Usually published by 16:00. Open this page again then."
   - Teacher, no forecast for today: "Ask the coordinator; you can note readings on paper meanwhile."
   - Admin before Publish: "Schools are waiting. Publish by 16:00 so heads have an hour."
4. **First-run card** per account (dismissible, remembered in `presko:session.seenIntro`). For the head: "Each school day, three things: ① by 16:30 record tomorrow's level; ② copy the official message and post it on your school's page and group chats; ③ at 8:00 a teacher enters indoor readings, and if they call for a higher level, re-confirm here." The coordinator and SDO get versions of their own.
5. **Day summary (end of day)** on Division after 17:00 for the plan date. It shows:
   - "Official N · late N · no decision N · messages marked sent N of 66".
   - "Copy situation report", a plain-text paragraph built from the same counts.
   - "Download log (CSV)".

   Add `messages.js sitrepText(vm)`.
6. **Better chasing:**
   - One line per school with **Copy** (school name + status + what to do).
   - Sort order: No decision first after 16:45; Re-confirm (readings) first before 12:00.
   - Change `chaseText` to cap the list at 10 names and end with "+N more".
7. **Fair `late`:** a decision after 17:00 isn't `late` when the forecast for that date was (re)published after 16:45. Add a `lateExempt` column and show "after forecast change" instead of a red "late". This is an engine change in `decisionsCSV` and the status UI, with a test.
8. **The SDO note label:** "Note (required to return, optional to approve)".
9. **Share:** next to every Copy, a **Share…** button where `navigator.share` exists, which opens Messenger, FB or SMS on phones. Copy stays as the fallback. After sharing, highlight the mark chips (as after Copy).
10. **After sending:** once at least one channel is marked, step 3's header reads "✓ Done for tomorrow. Next: 8:00 readings (check Building A, C first)". That closes the loop for the head.
11. **No-heat days (HAYO, regular plan):**
    - Today shows "Regular day: no change to classes." The primary button stays "Record HAYO (recommended)", and the message is labelled "optional: parents don't need a notice on regular days".
    - On Division, Chase missing **excludes** schools whose rule level is HAYO with plan type `full`, and the counts show "regular, no action needed".
    - Recording is still the head's act, so the permission model is unchanged.
12. **Teacher save feedback:** "Saved 08:04 · 2 of 3 buildings read · not read: Building C", shown as live text (`aria-live=polite`).
13. **Setup progress:** "Setup: 1 of 3 parts entered by the school", plus a list of the parts still illustrative.
14. **Re-read result line:** "Building A: hot → cooler. On HINGA days Pandac now has grounds to ask for F2F back." This comes from comparing view models before and after.
15. **Offline banner:** when `navigator.onLine === false`: "You're offline. Presko still works on this phone, and your changes stay here. (Prototype: nothing is sent to the SDO anyway.)" This is accurate today, because all data is local. The Claude re-read falls back to keywords, as it does now.

### P2: later
1. **Record the forecast's source:** the PAGASA bulletin issue time or number with the forecast (`forecast.bulletin`), shown in the header chip and the CSV.
2. **Draft pre-fill:** each new day's draft starts from the last published value, marked "from yesterday".
3. **"Seen by head" receipts** on SDO rows (`lastSeen` per account).
4. **Full Setup:** edit building names, rooms and storeys; add or remove buildings; sections editor.
5. **Official page in the message:** an `officialPage` field in Setup, used in the verify line ("Verify only on Pandac ES official FB page and SDO Iloilo City").
6. **Remember the message language** per account, with Hiligaynon suggested for parents.
7. **SMS-length message:** a variant under 160 characters.
8. **Lock out repeated wrong PINs:** after 5 wrong PINs, "Wait 30 seconds", which is cosmetic in the prototype.
9. **Interface in Filipino** for school screens. The parent messages are already trilingual.
10. **Help:** a "?" link on the level chip and the status line, opening the Rules page section for that level or status. School roles get a read-only Rules route, `#school-<slug>-rules`.

---

## 4. Consistency notes for the build
- Sign-in must not undo design §14 note 1: auth errors are persistent alert banners, not toasts.
- The DEMO tag (design §14 note 6) stays. Sign-in doesn't replace "demo, no sign-in" with a false claim: change the tag's `aria-label` to "Demo accounts, not a real sign-in".
- The demo script in `#demo` and §11 of the plan: replace "Switch: Pandac head" with "Demo ⇄ Pandac head". The timing is unchanged.
- Plan §2 says "There is no real login … role picker". Log an amendment: "Demo accounts with PIN; each account fixes one role and school; no free role picker outside demo mode."
