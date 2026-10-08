# MedLens — Complete Project Context

> **How to use this file.** Paste this entire document into any AI assistant (Claude, ChatGPT, Gemini,
> your coding tool) before asking it for help. It contains everything needed to understand the project:
> the problem, the solution, the rules that must never be broken, the exact AI contract, the data model,
> the stack, the constraints and the demo. Do not summarise it for the AI — give it the whole thing.

---

## 1. The project in one line

**MedLens** is a web platform where a person uploads a medical report (PDF or photo) and gets back a
plain-language explanation of every value, in their own language — with a doctor able to verify what
the AI wrote.

**One-line pitch:** *"Read your medical report in plain words, in your own language."*

**Second line:** *"Upload the report. MedLens explains every value, files it away, and a doctor checks it."*

---

## 2. The problem

Medical reports are written for clinicians, not for the people they describe.

1. **Wording nobody uses.** Clinical abbreviations, symbols, units and reference ranges assume expert
   knowledge. Patients search the terms online and find worst-case answers.
2. **Papers everywhere.** Reports arrive from different hospitals and labs — printed pages, PDFs,
   phone photos — with no single place to keep them or find them again.
3. **No picture of the past.** Each report is read in isolation, so nobody can see whether a value has
   been rising or falling over months.
4. **Written in the wrong language.** Almost all of it is English-first. Patients who read Telugu,
   Hindi, Tamil or Kannada are shut out.

**Cost to the patient:** unnecessary anxiety, questions that never get asked, and values that are
either missed or blown out of proportion — both are risky.

**And for the doctor:** patient-submitted reports carry no structure, and there is no lightweight way
to check what an AI has told a patient before the patient acts on it. There is no verification layer
between *"the AI said it"* and *"the patient believed it"*.

---

## 3. What MedLens does

One upload turns a hard-to-read report into something usable:

**Upload → extract → classify → explain → translate → store → track → doctor verifies**

1. Patient uploads a report as **PDF, JPG or PNG**.
2. The text is read — directly for digital PDFs, by OCR for scans and photos.
3. An AI model extracts **every test row**: test name, value, unit, the reference range *printed on
   that report*, and the report date.
4. Each value is marked **Normal / High / Low** by comparing it with that same printed range.
5. Each value gets a **plain-language explanation** of what that test measures and what the report says.
6. The explanation can be read in **English, Telugu, Hindi, Tamil or Kannada**.
7. Everything is stored in the patient's private **Document Vault**, and one value can be followed
   over time on a simple chart.
8. A **doctor reviews** the extracted values and the AI explanation, confirms or corrects it, and adds
   a professional note the patient can read.
9. An **admin** sees system-level counts and activity.

---

## 4. The five rules that must never be broken

These are product rules, not suggestions. Any AI helping on this project must respect them.

1. **Not a diagnostic system.** MedLens is an *educational health-information and record-management
   platform*. It never diagnoses, never suggests a treatment, never mentions a medicine or a dose.
   This disclaimer appears on screen and in every pitch.
2. **Reference ranges come from the report.** The status is decided against the range *printed on that
   particular report* — never a universal or hard-coded table. If the report does not state a range,
   the value is marked for human checking, not guessed.
3. **Unreadable means flagged, not invented.** If a value, unit or range cannot be read clearly, the
   row is flagged for a person to check. The system never fills a gap with a plausible number.
4. **A doctor has the last word.** AI output is always labelled as AI-generated, and a doctor can
   confirm, correct or flag it. The AI never makes an autonomous medical call.
5. **Synthetic data only.** Demo data is generated for the project. No real patient reports — not even
   blurred — appear in the app, the screenshots, the slides or the repository.

---

## 5. Users and what each one can see

| Role | Job | Can see | Must never see |
|---|---|---|---|
| **Patient** | Uploads reports, reads explanations, tracks values, keeps documents | Own reports, own values, own explanations, own trends, doctor notes addressed to them | Any other patient's data |
| **Doctor** | Reviews reports, verifies or corrects the AI summary, writes notes | The reports assigned to them, extracted values beside the original report, history, trends | Unrelated patients; admin functions |
| **Admin** | Runs the platform | Accounts, roles, document counts, processing status, activity | Clinical judgement — the admin manages the platform, not the medicine |

For the 12-hour MVP, roles are a simple switcher (a dropdown), not a full authentication system.
The **permission boundaries above still hold in the data layer** — every stored record is tagged with
its owner.

---

## 6. Features by role

### Patient
- Create an account and log in *(MVP: role switcher)*
- Upload a report as **PDF, JPG or PNG**
- See every extracted value with **Normal / High / Low**
- Read the plain-language explanation for each value
- Switch the explanation into their own language
- **Open any report** to see the original page/text beside the extracted values and the explanation
- Browse the **Document Vault** and reopen older reports
- Follow one value over time on a simple chart
- Read the doctor's note and verification status

### Doctor
- See the list of patient reports
- Open a report and read the extracted values **next to the original text**, not on their own
- Read the AI explanation exactly as the patient sees it
- **Confirm / flag / correct** the summary
- Write a professional note the patient can read
- Look at earlier reports and how a value has moved over time

### Admin
- Counts: total patients, total doctors, total documents, reports processed
- List of reports with processing status
- Recent activity feed (new patient, new doctor, report uploaded, report processed)
- Basic account list with roles
- Deliberately not a hospital administration system

---

## 7. The end-to-end pipeline (detailed)

```
            ┌──────────────┐
            │   PATIENT    │  uploads PDF / JPG / PNG
            └──────┬───────┘
                   ▼
        ┌──────────────────────┐
        │  Is it a PDF with    │  YES → PyMuPDF text extraction (fast, exact)
        │  real text inside?   │  NO  → render page to image → PaddleOCR
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │  TEXT READY          │  digital text  OR  OCR text
        │  (rows reconstructed │  lines grouped by position so a table row stays one row
        │   by position)       │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │  GEMINI (cloud)      │  structured extraction → JSON
        │  + plain explanation │  each row: test, value, unit, range, date, explanation
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │  CODE decides status │  compares value with the range from the SAME report
        │  Normal/High/Low     │  (not the model's job — this is a hard rule)
        └──────────┬───────────┘
                   ▼
        ┌────────────┬─────────────┬──────────────┐
        ▼            ▼             ▼              ▼
   Patient view  Doctor view   Vault + trend   Admin counts
        │            │
        ▼            ▼
   Translation   Verification + doctor note
   (5 languages)
```

### Reading the input — the exact rules
- **Digital PDF:** extract embedded text with PyMuPDF. It is exact and free. Never OCR a digital PDF.
- **Scanned PDF:** if a page yields almost no text (a good threshold is under ~100 characters per
  page), treat it as an image: render that page at 2× size and run OCR on it.
- **Photo (JPG/PNG):** run OCR. Phone photos need EXIF rotation correction first, or the image arrives
  sideways and nothing is detected.
- **Confidence check:** if OCR returns very few lines or very low average confidence, tell the user
  *"we could not read this clearly — please upload a sharper photo"*. Do not guess (Rule 3).
- **Fallback:** if OCR output is unusable, the raw image can be sent to the AI vision model instead.
  This is the safety net, not the main path.

---

## 8. The AI contract

### 8.1 What the model must return

The model receives the reconstructed report text and returns **JSON only**, matching this schema:

```json
{
  "report_title": "Lipid Profile & HbA1c",
  "report_date": "2026-08-14",
  "results": [
    {
      "test": "HbA1c",
      "value": "6.2",
      "unit": "%",
      "range_display": "Under 5.7 %",
      "ref_low": null,
      "ref_high": 5.7,
      "explanation": "HbA1c tells you your average blood sugar over the last three months."
    }
  ]
}
```

Rules for the extraction:
- `test` — the test name **exactly as printed** on the report (do not translate or rename it).
- `value` — the numeric value only, as text.
- `unit` — as printed (g/dL, mg/dL, %, cells/uL …).
- `range_display` — the reference range **exactly as printed**.
- `ref_low` / `ref_high` — numeric bounds parsed from that range. `"13 - 17"` → low 13, high 17;
  `"Under 5.7"` → high 5.7, low omitted; `"Above 40"` → low 40, high omitted. If nothing is stated,
  omit both — the row will be flagged.
- `explanation` — **one or two sentences**, plain everyday words, describing what the test measures.
  Never a diagnosis, never a treatment, never a dose.

### 8.2 The prompt (use this wording)

> You are reading a medical laboratory report. Extract every test row. Use ONLY the reference range
> printed on this report — never substitute a standard range. For each row: numeric value only, unit,
> the range exactly as printed, and numeric low/high bounds if a normal range is stated. Write a 1–2
> sentence plain-language explanation of what the test measures, understandable to someone with no
> medical training. Do not diagnose, do not recommend treatment, do not suggest doses. If a value or
> range cannot be read clearly, still include the row and keep the text as printed.

### 8.3 The status rule (computed in code, never by the model)

```
value < ref_low              → "LOW"
value > ref_high             → "HIGH"
inside the range             → "NORMAL"
no usable range              → "CHECK"   (needs a human eye)
value cannot be parsed       → "CHECK"
```

### 8.4 The explanation shown to the patient

The model's sentence, plus a status line, plus a pointer to a professional whenever the status is
not NORMAL:

- HIGH → *"Your result is above the reference range printed on this report. Consider discussing this
  result with a qualified healthcare professional."*
- LOW → *"Your result is below the reference range printed on this report. Consider discussing this…"*
- CHECK → *"This value could not be classified confidently — please have it checked."*
- NORMAL → *"Your result is within the reference range printed on this report."*

General educational lifestyle context may be shown, but **clearly labelled as general information**,
never as advice for this patient's condition.

### 8.5 Translation rule

Translate **only the prose**. The test names, numbers, units, ranges and statuses stay exactly as
reported. Prompt: *"Translate the following health-report explanation into {language}. Keep the
meaning exact, keep all numbers, units and ranges unchanged. Use simple everyday words. Return only
the translation."*

Languages: **English, Telugu, Hindi, Tamil, Kannada.**

---

## 9. Data model

Minimum fields needed for the MVP (a flat JSON store is acceptable; Postgres mirrors it later).

| Entity | Key fields |
|---|---|
| `profiles` | id, full_name, role (patient / doctor / admin), language preference |
| `patients` | id, profile_id, age, sex |
| `doctors` | id, profile_id, speciality |
| `medical_documents` | id, patient_id, title, report_date, file_path, processing_status (uploaded / processed / failed), uploaded_at |
| `lab_results` | id, document_id, test_name, value, unit, range_display, ref_low, ref_high, status (NORMAL/HIGH/LOW/CHECK), explanation, source_snippet |
| `ai_summaries` | id, document_id, language, summary_text, model_used, created_at |
| `doctor_notes` | id, document_id, doctor_id, note_text, verification (confirmed / flagged / corrected), created_at |

**`source_snippet` matters.** Store the exact line of report text each value came from. It is how a
doctor verifies in seconds, and it is the answer to *"what if the AI misread a value?"*

---

## 10. Technology

### The brief specifies (production target)
- **Frontend:** Next.js / React, Tailwind CSS, Recharts
- **Backend:** Python FastAPI (REST, uploads, processing, validation)
- **Document processing:** PyMuPDF / pdfplumber, plus OCR for scans
- **AI:** Google Gemini API — document understanding, extraction, simplification, translation
- **Database & storage:** Supabase — PostgreSQL, Auth, Storage, Row Level Security

### What the 12-hour MVP actually uses (and why)
- **One Python app (Streamlit) for all screens** — one language, one process, no build step, no CORS,
  no auth system to debug. Two people with no web-app experience cannot reliably ship and debug a
  two-service React + FastAPI app in 12 hours, especially with a live demo.
- **Gemini API** — unchanged from the brief. All heavy AI is in the cloud; nothing heavy runs locally.
- **PyMuPDF** for digital PDF text; **PaddleOCR** for scans and photos.
- **Local JSON file** as the working store, with an **optional Supabase mirror** (Postgres) when it
  fits in the time budget. Supabase must never be able to break the demo.

**Say this plainly if a judge asks:** *"The brief's stack is the production path and the data model is
unchanged. With 12 hours and a live demo, we chose the stack we could make reliable — one Python app
instead of two services and a build step. Swapping the front end later doesn't touch the extraction
or the database."* Then move on. A deliberate trade-off reads far better than a broken React app.

### OCR decision
**PaddleOCR, not Tesseract.** Reasons: better accuracy on photographed documents and cluttered
backgrounds, no separate system binary to install, works fully offline once the models are downloaded,
and it returns per-line confidence scores, which the flagging rule needs.

---

## 11. Security and privacy (MVP, stated honestly)

- Roles and permission boundaries enforced in the data layer (each record has an owner)
- Report files are never public; no open links are generated
- API keys live in a `.env` file that is **never** committed, screenshotted or pasted into a chat
- No patient information is placed in page code or logs
- User-supplied data and AI-generated text are stored and **displayed differently** — AI text is always
  labelled as AI-generated
- Not presented as a certified medical or hospital system

For a full build: Supabase Auth, Row Level Security on every table, signed short-lived file URLs,
audit logging, and consent aligned with India's DPDP Act.

---

## 12. Constraints this build lives under

- **12 hours total**, 2 people (~20 productive hours)
- **No web-app development experience** on the team
- Built with AI coding assistance ("vibe coding") — so the stack must be one the AI can generate
  reliably and the team can *test* by clicking
- **Live demo in front of judges** — reliability beats feature count, always
- One laptop, running on `localhost`
- 4 synthetic sample reports + seeded history are the demo dataset

---

## 13. Scope

**Must have (the demo is broken without these)**
1. Upload a PDF and a photo, and read both
2. Extracted table with test, value, unit, printed range, status
3. Plain-language explanation per value
4. Language switch — at minimum Telugu, live on screen
5. Vault list + one trend chart over ~5 months
6. Doctor view: confirm + note
7. Admin counters
8. The disclaimer, on screen

**Stretch (only if everything above works)** — all five languages live, Supabase mirror, live AI upload
for any file, flagging UI for low-confidence rows

**Do not build** — signup/password reset, email, file-storage buckets, multi-report comparison, PDF
export, role management screens, doctor→patient assignment logic, failed-job queues, cloud deployment

---

## 14. Language rules for the interface

Plain words on every patient-facing screen. Real test names are kept, with a short gloss in brackets —
because renaming a test changes its meaning.

| Test (as printed) | Plain gloss shown under it |
|---|---|
| Haemoglobin | carries oxygen in your blood |
| HbA1c | average blood sugar over the last three months |
| LDL Cholesterol | the "bad" cholesterol |
| HDL Cholesterol | the "good" cholesterol |
| Triglycerides | another type of fat in your blood |
| Fasting Blood Sugar | blood sugar after not eating for about 8 hours |
| Creatinine | a waste product your kidneys filter out |
| WBC Count | white cells that fight infection |
| Platelet Count | cells that help blood clot |

Words to avoid in patient screens: *ref range, analyte, specimen, panel, assay, sub-optimal, borderline
diabetes, abnormal* (say "marked High" instead), *consult a physician* (say "talk to a doctor").

Never say: *"you have…"*, *"this indicates disease"*, *"you should take…"*.

---

## 15. The demo (2 minutes, live)

| Time | Action | Words |
|---|---|---|
| 0:00 | — | "A report is written for the doctor who ordered it — not the person it's about." |
| 0:15 | Upload a real PDF | "I'm the patient. Watch what happens to an ordinary lab report." |
| 0:40 | Results table | "Every value, its unit, and the range **printed on this report** — marked Normal, High or Low." |
| 1:00 | Open HbA1c → switch to Telugu | "The explanation, in the language *I* think in." ← the moment they remember |
| 1:20 | Vault + trend chart | "The same value across five months — the thing a single report can't show you." |
| 1:35 | Doctor view → confirm + note | "The AI writes it. A doctor signs it off. The AI never has the last word." |
| 1:50 | Admin counters | "And the platform view for whoever runs it." |
| 1:55 | Close | "MedLens doesn't diagnose. It makes your report legible — and keeps a professional in the loop." |

### The three questions that will be asked

1. **"What if the AI misreads a value?"** → Status is computed in code from the range printed on the
   report, not decided by the model. Each value keeps the source snippet it came from, low-confidence
   rows are flagged rather than guessed, and a doctor confirms before the patient relies on it.
2. **"Is this a medical device?"** → No. It is an educational information and record-keeping tool,
   stated on screen and in the deck. All demo data is synthetic.
3. **"What about real patient data?"** → None is used. Keys stay server-side, and each record is
   scoped to its owner.

---

## 16. How an AI assistant should help on this project

When asked to work on MedLens:

1. **Change one thing at a time,** and show the diff before applying it. Never rewrite a working file.
2. **Never touch the status rule** unless explicitly asked. It is the heart of the project.
3. **Never add a diagnosis, a medicine name, a dose, or a universal reference range.** Flag and stop.
4. Explain changes in **plain language** — the team has no web-development background.
5. Prefer the **smallest change that works**; no refactors, no renames, no reorganising after hour 9.
6. When debugging, ask for the **full traceback plus what the user clicked** before proposing a fix.
7. Keep everything runnable with **one command** on `localhost`.
8. If a request would break a product rule in §4, say so instead of implementing it.

---

## 17. Mini-glossary (for the team, so nobody gets lost)

| Term | What it actually means here |
|---|---|
| OCR | Software that reads text out of a picture of a document |
| PaddleOCR | The OCR library we use; reads documents and gives text plus confidence scores |
| PyMuPDF | Reads text directly out of digital PDFs (no OCR needed) |
| Gemini | Google's AI model, used through an API; it reads the report and writes the explanation |
| API key | The password-like string that lets our app use Gemini; must stay in `.env` |
| Schema | The fixed shape of the JSON the AI must return |
| Reference range | The "normal" range printed on the report next to each test |
| Streamlit | The Python library we use to make the screens; saves to one file and runs with one command |
| Vault | The patient's private list of stored reports |
| Seeded data | Fake pre-loaded reports so the demo always works |
| Fallback | What we switch to when something breaks live — here, a pre-loaded dataset |
