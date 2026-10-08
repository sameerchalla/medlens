# MedLens — 12-Hour Build Playbook
### 2 people · no web-app experience · AI-assisted ("vibe") coding · PaddleOCR (no Tesseract) · live demo

> Follow this top to bottom. Every hour has a **checkpoint** — a thing you can look at and say
> "yes, that works". If a checkpoint fails, use the *If it fails* line instead of debugging past it.
> Nothing in this plan requires writing code from scratch: you describe each step to an AI assistant
> (using the prompts in §8) and test the result in the browser.

---

## §0. The three rules of this sprint

1. **One hour without a working checkpoint is a failed hour.** Checkpoints are pass/fail, not "mostly".
2. **A working end-to-end path beats five half-built features.** The demo runs *one* full flow well.
3. **Everything has a fallback that runs offline.** Assume Gemini, wifi or a file will fail live.

---

## §1. The stack decision (read this once, out loud, then move on)

**Build it as one Python app: Streamlit + PyMuPDF + PaddleOCR + Gemini (+ optional Supabase mirror).**

Why this and not the brief's Next.js/FastAPI stack:

- One language, one file, one command (`streamlit run app.py`). No build step, no CORS, no two servers.
- The AI assistant that generates your code is most reliable at single-file Python.
- When it breaks at 2 AM you can *read* the code and fix it. You cannot debug a broken React build.
- The brief's stack stays the production path; the data model and the extraction logic are identical.

**20-minute stack check (do this first):** ask an organiser whether the stated stack is *required* or
*recommended*. If required, use §12 (Appendix) instead of §5's UI steps — everything else in this
playbook stays the same.

**Screens are three "views" in the same app** — Patient, Doctor, Admin — chosen by a dropdown in the
sidebar. That is all the "login" the MVP needs.

---

## §2. What you are building (nothing more)

| Screen | Contains | Done when |
|---|---|---|
| **Patient** | Upload box · results table (test, value, unit, printed range, status) · plain explanation · language switch · vault list · trend chart keyed to the patient | A PDF and a photo both produce a correct table and a Telugu explanation |
| **Doctor** | Report list · values + AI explanation beside the original text · Confirm / Flag buttons · note box | A note typed here appears on the Patient screen |
| **Admin** | Four counters · report list with status · activity feed · account list | Counters change after an upload |

**The definition of done for the whole build:**
> On stage, upload a PDF, see values marked Normal/High/Low, open one value, switch it to Telugu,
> show the vault and the 5-month trend, switch to Doctor, confirm with a note, show Admin counters —
> **and do all of it again with wifi off.**

---

## §3. Hour 0 — environment (30–40 minutes, both people together)

Do this **before anything else**. The installer is the riskiest part of the plan; a broken environment
at hour 8 is unrecoverable, at hour 0 it is a shrug.

```bash
# 1. Check Python. Use 3.11 or 3.12 — NOT 3.13 (Paddle wheels lag).
python --version

# 2. One virtual environment for the project
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate

# 3. Install everything
pip install streamlit paddleocr paddlepaddle pymupdf google-genai
```

```bash
# 4. PROVE OCR WORKS BEFORE WRITING ANY APP CODE.
#    First run downloads models (~150 MB) — needs internet ONCE, then works offline.
python -c "from paddleocr import PaddleOCR; o=PaddleOCR(lang='en'); r=o.predict('photo.jpg'); print(r); o.close()"
```

```bash
# 5. PROVE GEMINI WORKS BEFORE WRITING ANY APP CODE.
python -c "from google import genai; import os; c=genai.Client(api_key=os.environ['GEMINI_API_KEY']); print(c.models.generate_content(model='gemini-2.5-flash', contents='say ok').text)"
```

**Checkpoint H0:** OCR prints text lines from a photo, and Gemini prints `ok`.
**Before moving on:** run the OCR command a second time with the **wifi off**. If it still works, your
models are cached and your demo is safe.
**If it fails:** see the failure table in §9 — every failure here has a written workaround.

---

## §4. PaddleOCR — the exact details (this is your OCR layer)

### 4.1 Setup rules that matter

| Rule | Why |
|---|---|
| Python **3.11 / 3.12**, 64-bit | Paddle wheels for 3.13 are inconsistent |
| `pip install paddlepaddle` **then** `pip install paddleocr` | PaddleOCR needs the framework separately |
| Create the OCR object **once** and reuse it | Model load takes seconds; creating it per click freezes the app |
| In Streamlit, cache it with `@st.cache_resource` | Otherwise every button click reloads the models |
| Run one OCR pass **before the demo** | Downloads and caches the models |
| `ocr.close()` when done in scripts | Frees memory |
| Use the default **PP-OCRv5** model | Good English accuracy, handles messy photos |

### 4.2 The shape to ask your AI coder for

```python
# Created ONCE for the whole app, never per click
@st.cache_resource
def get_ocr():
    from paddleocr import PaddleOCR
    return PaddleOCR(lang="en",
                     use_doc_orientation_classify=False,   # off = faster
                     use_doc_unwarping=False,               # off = faster
                     use_textline_orientation=False)        # on if pages are rotated

# Returns text lines WITH position (needed to rebuild table rows)
res = get_ocr().predict(image)          # image = file path, PIL image or numpy array
for page in res:
    texts, boxes, scores = page["rec_texts"], page["rec_boxes"], page["rec_scores"]
```

> **Version note:** the result keys differ slightly between 3.x releases. If `page["rec_texts"]`
> raises an error, ask the AI to `print(res)` / inspect the JSON structure and adapt — two minutes,
> not a crisis.

### 4.3 Rebuilding a report table from OCR lines (say this to your AI, verbatim)

> PaddleOCR returns individual text lines with bounding boxes. A lab report is a table, so rebuild the
> rows: sort lines by the vertical centre of their box, group lines whose centres are within about 1.5%
> of the image height of each other, sort each group left-to-right by the horizontal centre, and join
> the lines in a group with " | ". Return the reconstructed text block, one table row per line.

Without this step the numbers and their test names get scrambled, and the AI extraction then produces
nonsense. **This is the single most important detail in the OCR layer.**

### 4.4 Input handling (non-negotiable)

- **Digital PDF → never OCR it.** Use PyMuPDF: `"\n".join(p.get_text() for p in fitz.open(path))`.
- **Scanned PDF → render page at 2× and OCR it**: `doc[0].get_pixmap(matrix=fitz.Matrix(2, 2))`.
- **Scanned-PDF detector:** if a page's extracted text is under ~100 characters, treat it as a scan.
- **Photos → fix rotation first.** `ImageOps.exif_transpose(img)`, then convert to RGB and pass as a
  numpy array. A sideways phone photo detects nothing, and this is the #1 cause of "OCR is broken".
- **Low confidence → say so.** If OCR returns very few lines or a low average score, show
  *"We couldn't read this clearly — please upload a sharper photo."* Never guess (product rule).
- **Graceful degradation:** if OCR fails on an image, send the image itself to Gemini as a fallback.

### 4.5 Language scope (keep it honest)

Lab reports in India are printed in **English** — the test names, units and ranges. That is the demo
path, and English OCR covers it. **Translation** into Telugu/Hindi/Tamil/Kannada happens *after*
extraction, in the text layer, and needs no OCR models. If a judge hands you a regional-language
scanned report, say the demo path is English-printed reports and regional OCR is on the roadmap.

---

## §5. Hour by hour (12 hours, 2 people)

### H0–H1 · Environment + first proof
- Both: §3 setup. Prove OCR and Gemini.
- A: put the Gemini key into `.env` (never into a chat, a screenshot, or the repo).
- B: collect 4 printable sample reports (or make synthetic ones) — one **digital PDF**, one **phone
  photo of a printed page**, and 2 more for history.

**Checkpoint:** OCR prints lines with wifi off · Gemini prints `ok`.
**If it fails:** §9 row 1–3.

### H1–H2.5 · The pipeline in the terminal, no screens
- A: one script that takes a file → text (PyMuPDF or PaddleOCR) → Gemini → prints JSON per §8.1 of the
  context file. Run it on the digital PDF, then on the photo. Compare output against the paper by eye.

**Checkpoint:** both files produce correct test/value/unit/range rows. **Status is not computed yet.**
**If it fails:** fix the **row reconstruction** (§4.3) before touching the prompt. Scrambled input is
almost always the real cause of "the AI got it wrong".

### H2.5–H4.5 · Patient screen
- B (with A): Streamlit app — role dropdown, upload box, results table with coloured status pills,
  plain explanation panel, language radio buttons.
- A: the **status rule** in code (§8.3 of the context file) — 6 lines. Freeze it once it passes.

**Checkpoint:** upload the real PDF in the browser → correct table appears → status pills correct.
**If it fails:** the fallback is a "load sample report" button that reads a saved JSON. Build that
button at H3 regardless — it becomes your stage safety net.

### H4.5–H6 · Store, vault, trend
- A: save each processed report to a local JSON file (`store.json`), keyed by owner and date.
- B: vault list + one line chart of a single value over the reports.

**Checkpoint:** reload the page — the uploaded report is still there, and the chart plots at least 3
points for one test.
**If it fails:** hard-code 3 seeded reports into the JSON and keep going. The vault is a list, not a
database project.

### H6–H7.5 · Doctor screen
- B: report list → values beside the AI explanation → **Confirm** and **Flag** buttons → note text box.
- A: the note writes to the store and appears on the Patient screen; the button writes an activity row.

**Checkpoint:** confirm a note as Doctor → switch to Patient → the note is there.
**If it fails:** write the note to a variable in session state and demo it inside one session.

### H7.5–H9 · Demo data + polish
- B: seed **4 reports over 5 months** with one value clearly climbing. The same test must be spelled
  **identically** in every report (`HbA1c`, never `HbA1C` / `Glycated Hb`) or the chart is empty.
- B: replace the admin figures with your own numbers and make the activity feed fill as you click.
- A: polish the table — bigger status pills, the plain gloss under each test name in small grey text.

**Checkpoint:** the seeded story is visible end-to-end with **Live AI switched off**.
**If it fails:** nothing here is optional except the polish. Seed data is the demo.

### H9–H10 · Failure drill, then freeze
- Unplug the wifi (or toggle Live AI off) **mid-flow** and confirm the demo still completes.
- Test the ugly cases: a photo at an angle, a PDF with 3 pages, a file that is not a report.
- **At H10: feature freeze.** No new anything. Fix only what is broken.

**Checkpoint:** the full 2-minute script runs twice in a row without a crash.
**If it fails:** cut features, not the flow. Doctor note → a read-only note. Chart → a list of numbers.

### H10–H11 · Rehearse and record
- Record the whole flow as a **backup video** on the phone (90 seconds, no talking needed).
- Rehearse the 2-minute script (**§15 of the context file**) three times, out loud, timed, swapping
  driver and speaker once.

**Checkpoint:** you can both drive it without reading instructions.

### H11–H12 · Buffer and submit
- This block exists because something always breaks. Do not spend it on a new feature.
- Final checks: the disclaimer is on screen · `.env` is not in the repository · no real patient data
  anywhere · the app starts with one command on the demo laptop.

**Checkpoint:** cold-start test — close everything, run the one command, demo it.

---

## §6. Who does what

| | **A — Pipeline & app** | **B — Content, data & QA** |
|---|---|---|
| Owns | Terminal, `.env`, OCR, Gemini calls, status rule, storage | Sample reports, seeded history, screen wording, demo script, checklist |
| Method | One AI prompt → one change → click it → commit | Writes the test list, clicks through, reports bugs as *"on this screen, doing this, I saw that"* |
| Never | Writes the demo script | Edits the app file while A is in it |

Swap roles at H8 so both of you can present on stage.

**Coordination rule:** with one app file, only **one person edits it at a time**. The other works on
data, wording, or testing — never on the same file.

---

## §7. Git survival kit (your undo button — use it every hour)

The AI will eventually break something that worked. Being able to go back 10 minutes is the difference
between finishing and not.

```bash
git init                       # once, at H0
git add .
git commit -m "patient screen working"    # after EVERY working change

git status                     # what has changed?
git log --oneline              # what did I save?
git checkout .                 # UNDO everything since the last commit  ← your panic button
```

Rule: **if it works, commit it.** Before you ask the AI for a risky change, commit first.

---

## §8. Prompt pack for your AI coder (copy-paste in this order)

One prompt → test in the browser → next prompt. Never two prompts without testing between them.

1. **Orient:** *"Read this file. Don't change anything. Tell me in plain English what each view does, which
   function decides Normal/High/Low and how, and where the AI is called. Then give me the 3 smallest
   changes you'd make, ranked by risk."*
2. **OCR in isolation:** *"Write `test_ocr.py`: it loads a photo, corrects EXIF rotation, runs PaddleOCR
   with doc-orientation and unwarping disabled, groups the returned lines into table rows by their
   vertical position, and prints the reconstructed text. Under 50 lines. Don't touch the app."*
3. **Pipeline in isolation:** *"Write `test_pipeline.py`: it takes a file path, uses PyMuPDF text if the
   PDF has real text (else renders the page at 2× and OCRs it), sends the text to Gemini with the
   schema and prompt below, and prints the JSON. Don't touch the app."*
4. **Wire it in:** *"Add an upload box to the Patient view that runs the pipeline and shows the results
   table. Reuse the functions from the test scripts; don't rewrite them."*
5. **Status rule:** *"Add `classify(value, ref_low, ref_high)` returning NORMAL/HIGH/LOW/CHECK exactly as
   specified. Show me the function and nothing else."*
6. **Store:** *"Save each processed report to `store.json` with an id, owner, date and results. Load it
   on start. Keep it under 20 lines."*
7. **Doctor note:** *"On Confirm, save the note so the Patient view shows it with the doctor's name and
   time. Change only what's needed."*
8. **Debug (the most important prompt — always give all four parts):**
   *"The app fails. Traceback: [paste FULL traceback]. I was doing: [the exact click]. I expected:
   [what should happen]. I saw: [what happened]. Give me the cause and the smallest fix. Don't rewrite
   the file."*
   If the answer is big, reply: **"smaller. only change what's necessary."**
9. **Stop the refactor:** *"Don't refactor, don't rename, don't reorganise. Make the smallest change that
   does this one thing, and show me the diff first."*

---

## §9. Failure playbook (decide now, not at hour 11)

| Symptom | Cause | Do this |
|---|---|---|
| `pip install paddlepaddle` fails | Python 3.13, or 32-bit Python | Install Python 3.11/3.12 64-bit, recreate the venv |
| OCR returns nothing on a photo | Image sideways (EXIF) or too small | Rotate with `ImageOps.exif_transpose`, upscale to ≥1000 px wide, retry |
| OCR text is scrambled into wrong rows | No row reconstruction | Apply §4.3 before blaming the model |
| OCR works but numbers are wrong | Photo too blurry / angled | Re-shoot flat, in daylight, straight above the page |
| App freezes on every click | OCR object created on every run | Move it into `@st.cache_resource` |
| Gemini returns junk or refuses | Prompt drifting from the contract | Send §8.2 wording exactly; keep JSON mode on |
| Gemini quota / rate limit at the wrong moment | Free-tier limits | **Toggle Live AI off** — seeded data still runs the full demo |
| Upload errors live | Anything | Close the error, load a seeded report, keep talking |
| Trend chart empty | Test name spelled differently across reports | Fix spelling in the seed data |
| Supabase won't cooperate | Auth/keys/RLS | **Drop it.** Say "mirrored in the full build" and keep going |

**Never debug in front of judges.** Switch to the fallback and keep presenting.

---

## §10. Banned list (do not build, any hour)

Signup, password reset, email, file-storage buckets, real authentication, multi-report comparison,
PDF export, role-management screens, doctor→patient assignment logic, failed-job queues, localisation
of the *interface* (only explanations are translated), cloud deployment.

**Deployment is the biggest time thief** — CORS and environment variables can eat two hours for zero
judging credit. Demo on `localhost`. Always.

---

## §11. Hand-in checklist

- [ ] One command starts the app on the demo laptop, tested cold
- [ ] PDF path works · photo path works · both tested on the actual demo files
- [ ] Status is computed from the report's own range (verify by changing a value by hand)
- [ ] Telugu switch works live on screen; the other three languages are ready
- [ ] Vault shows 4 seeded reports across 5 months; the chart has ≥3 points
- [ ] Doctor confirm + note appear on the Patient screen
- [ ] Admin counters and activity feed react to an upload
- [ ] Disclaimer visible on screen
- [ ] Wifi-off run completes the full 2-minute script
- [ ] Backup video recorded on a phone
- [ ] `.env` not committed · no real patient data anywhere · synthetic reports only
- [ ] Pitch deck and context file (`MedLens_Project_Context.md`) open in tabs

---

## §12. Appendix — if the brief's stack is mandatory

Keep everything in §4 (OCR), §8.1–8.5 (the AI contract) and §9 (failures) exactly as written. Only the
UI layer changes:

- **Backend:** FastAPI with 4 endpoints — `POST /upload`, `GET /reports`, `GET /report/{id}`,
  `POST /note`. All extraction/OCR logic stays the same Python code.
- **Frontend:** one Next.js page with three tabs (Patient / Doctor / Admin). Do **not** build routing,
  auth or state management.
- **Cost:** roughly +2 hours and a materially higher chance of a broken build on stage.
- **Mitigation:** run the FastAPI server and the Next dev server in two terminals; test the API with
  curl before touching the UI; if the frontend is not working at **H8**, demo the API through the
  FastAPI `/docs` page instead — it still shows a real working system.

---

### One last thing

The thing that wins this hackathon is not the model, the OCR, or the design. It is that a patient can
hand over a report, and **within seconds see it in words they understand, in their own language, with a
doctor's name on the verification.** Protect that flow with everything else you cut.
