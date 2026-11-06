# Grade 2 science question bank

The active `questions.yaml` is based on these two documents in `~/Downloads/`:

- `Grade 2 Science Reviewer (Part 1) 2.docx`
- `Grade 2 Science Reviewer (Part 2) 2.docx`

The previous `questions.yaml` was copied byte-for-byte to `apsci.yaml` before replacement. `hkiso.yaml` is unchanged.

## Sources and round sizes

| Source | Easy | Average | Difficult | Clincher | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Part 1 multiple-choice test | 15 | 15 | 10 | 0 | 40 |
| Part 2 multiple-choice test | 15 | 15 | 10 | 0 | 40 |
| Additional questions based on the reviewer notes and examples | 20 | 20 | 30 | 50 | 120 |
| **Total** | **50** | **50** | **50** | **50** | **200** |

Both documents include a multiple-choice test followed by the same questions in an answer-key section. Each test question is included only once. The original 80 questions keep their source round assignments and choice order, apart from the correction below. Answers and explanations come from the answer keys.

The documents do not provide a clincher round. Additional questions turn their review facts, examples, and short-answer material into four-choice items. These questions, their distractors, explanations, and difficulty assignments are editorial additions, not verbatim extracted multiple-choice questions. No questions from the previous bank were carried over.

- **Easy:** basic identification, senses, body parts, and familiar facts.
- **Average:** classification, terminology, and simple applications.
- **Difficult:** interpreting observations and predicting effects.
- **Clincher:** combining clues, comparing explanations, matching multiple tasks, and reasoning through sequences, within the Grade 2 coverage.

Each round covers all four existing topics: `Living Things`, `Matter`, `Force, Motion, and Energy`, and `Earth and Space`. Equal topic counts are not required: the reviewers contain more material about living things than matter.

## Editorial corrections and judgments

- Part 1, item 19 incorrectly uses a wind vane to detect strong winds. The replacement asks which instrument measures wind speed and supplies **Anemometer** as the correct choice. A wind vane measures direction, not speed.
- Whitespace and broken paragraph lines were normalized. Choice labels and question numbers are omitted because questions and choices are shuffled independently in the game.
- The notes' incomplete Moon-phase label `Last` is understood as **last quarter**. Waxing means the lighted portion is increasing; waning means it is decreasing.
- The reviewers' habitat examples are not treated as exclusive rules: not all fish live in oceans, and not all camels live in hot deserts.
- Added water-safety questions distinguish a natural water source from water that is safe to drink. Untreated seawater is not drinking water.
- Neither DOCX contains embedded media, so no image transcription was needed.

## Format and game compatibility

The schema is unchanged: `easy`, `average`, `difficult`, and `clincher` contain entries with `question`, four unique `choices`, `answer`, `topic`, and `explanation`. Strings are JSON-quoted, as required by the game's existing YAML parser. Every answer exactly matches one choice.

Correct answers normally deal 10 damage against a 100-HP opponent. Fifty questions per round comfortably cover the longest surviving battles, including Elephant healing or a Gorilla skip. The existing game tests check these bounds. Choices are still shuffled by the game without changing answer text or mutating the source bank.

The service-worker cache version was incremented so installed/offline clients receive the replacement bank after the updated worker activates.
