# PDF science question bank

`questions.yaml` replaces the previous practice bank with all 150 questions from the five supplied `~/Downloads/cm-*.pdf` files (30 per PDF). No additional questions or distractors were invented.

The schema is unchanged: `easy`, `average`, `difficult`, and `clincher` contain entries with `question`, four `choices`, `answer`, `topic`, and `explanation`. The existing `topic` field holds the requested file-based category, even when a question's subject overlaps another category.

| Source | Category | Easy | Average | Difficult | Clincher | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `cm-ps.pdf` | Physical Science | 8 | 2 | 11 | 9 | 30 |
| `cm-ec.pdf` | Elementary Chemistry | 11 | 9 | 5 | 5 | 30 |
| `cm-es.pdf` | Earth Science | 5 | 11 | 7 | 7 | 30 |
| `cm-is.pdf` | Integrated Science | 12 | 5 | 8 | 5 | 30 |
| `cm-hr.pdf` | Heat Round | 6 | 7 | 10 | 7 | 30 |
| **Total** | | **42** | **34** | **41** | **33** | **150** |

There are at least 20 items in each difficulty across the bank. There cannot be 20 per difficulty in every category: each source contains only 30 questions, not the 80 that would require. No duplication or new questions were used to pad the counts.

## Difficulty assessment

- **Easy:** direct definitions, familiar facts, and straightforward identification.
- **Average:** more specialized terminology, classification, and facts presented through brief descriptions. A scenario that only asks for a familiar term or fact is not automatically difficult.
- **Difficult:** applying a principle to a situation, interpreting an observation, predicting a consequence, or a straightforward calculation.
- **Clincher:** combining clues, comparing explanations, matching multiple tasks or observations, evaluating a claim, or reasoning through a sequence. These are relative to the supplied elementary-level material, not newly written advanced questions.

## Extraction and answer verification

Text was extracted with Poppler. Image-only question text and tables were read from rendered PDF pages and transcribed into the existing `question` string. The answer keys were extracted from the green correct-answer markers, **not** the learner's selected responses (which are sometimes wrong). Tests retain the original A–D keys as a regression check; YAML choices remain in source order.

Every explanation starts with its source filename and original question number, such as `cm-es.pdf, question 7:`. The explanatory sentences were added for the game's existing wrong-answer review; they are not explanations quoted from the PDFs. Personal details, results-page navigation, scores, and URLs were not copied into the bank.

Only formatting/context cleanup was applied to prompts:

- Whitespace and page breaks were normalized; source questions and all four choices were retained.
- Earth Science questions 7, 9, and 22 include the original image-only tables as text, and question 26 includes its image-only scenario paragraph. Its decorative factory picture is unnecessary to answer the supplied paragraph. Question 27's original paragraph already describes the before/after illustration, so the bitmap is not needed.
- Physical Science question 25 includes the original table as text; its touch/no-touch checkmarks are written as Yes/No. The toy-car and parachute text diagrams are retained.
- Heat Round question 6 repeats the original food chain from question 5. Questions 14–18 include the aquarium picture's labels as text. Shared question-number headings were removed because questions are displayed independently and shuffled. The plant questions already describe the conditions needed to answer them.
- Physical Science question 29 had a stray `11 meters` appended to its question text in the PDF. Only that stray fragment was removed; the actual `11 meters` distractor remains unchanged.
- Integrated Science question 30 says “based on the chart,” but no separate chart is present for that question in the supplied results PDF. The four choices themselves provide all sound levels needed; only that dangling phrase was removed.
- Numerical questions from the supplied PDFs are retained. The old no-number restriction and old practice-question assertions no longer describe this replacement bank.

Newlines in transcribed tables are displayed in both battle and wrong-answer review without introducing HTML or new YAML fields.

## Choice randomization

The game already calls `shuffledQuestion()` for every displayed question. It uses a Fisher–Yates shuffle of a copied choices array; the source bank is not mutated. Correctness is checked against answer text, not a fixed button position. Tests cover shuffle permutations, rendered button order, grading, highlighting, and wrong-answer review. No second shuffle implementation, dependency, or schema option was added.

The service-worker cache version was incremented so installed/offline clients receive the replacement bank after the updated worker activates.
