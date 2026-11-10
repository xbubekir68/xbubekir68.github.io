# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

German-speaking adults, mostly beginners, learning Modern Standard Arabic (Fusha). They have two goals of equal weight:

- read the Qur'an, including its script and signs;
- understand Fusha as a language: words, sentences and grammar with full case endings.

Some learners can already read Arabic script. A placement test (Wissenstest) moves them past what they know instead of making them start at the alphabet.

Learners use it in short daily sessions on a phone, signed in or as a guest.

## Product Purpose

Mufradaat (مفردات, "vocabulary") is an Arabic course for German speakers. It runs as an installable web app. Its own tagline is "Hocharabisch für Deutschsprachige: Schrift, Wörter und Sätze mit allen Endungen."

The course has two stages (Stufen):

1. **Lesen lernen**: eight sections (Etappen S1–S8). They run from single letters through connected forms, short vowels, tanwin, long vowels, sukun and shadda, and end with reading everything together, including the signs of Qur'anic script.
2. **Sprache lernen**: one section per lesson of a proven three-volume curriculum, 88 in total. Each section adds vocabulary lessons. The target is over 1,000 words by the middle of the second part and about 1,800 by the end.
   It grows in packages of two sections. Each package goes from draft to the owner's proofreading, then audio from the owner's PC, then into the app. Sections 1 and 2 are live: "Was ist das?" (هَذَا, a sentence without "is", Tanwin as "a", questions with مَا and أَ, yes and no) and "Das dort" (ذَلِكَ, وَ, مَنْ, first names). Together they have 33 words, 50 own sentences, 6 mini-dialogues and 6 grammar tips. Words that already existed keep their ID, so learning progress carries over. Each section has six lessons:
   - vocabulary lessons: new word card, meaning, listening, Arabic from German, matching pairs, due words;
   - sentence lessons: small new words such as هَذَا, then each sentence in the tip's order, understood or built in turn, plus the new drills "Endung wählen" (pick -un, -an or -in) and "Diktat" (hear a sentence and type it on the Arabic on-screen keyboard);
   - a closing mini-dialogue lesson: hear or read a short exchange and pick the fitting last line, with review of the section's sentences and words.
   Sections 3 and 4 ("Der, die, das", "Wo ist es?") come next. Everything is listed for native-speaker review in `tools/grammatik-pruefen.md`. The earlier interim sections W1–W10, built from the old word list, are gone.

Success means two things. A learner can read vocalized Arabic, the Qur'an included, without help. They also understand and produce Fusha sentences with correct endings, and they come back daily to keep that up.

## Positioning

These two promises are binding on every future surface:

- **Built for German speakers.** Explanations, grammar tips, memory aids and the interface are written in German for German speakers. It is not a translated one-size-fits-all course.
- **Fusha only, Qur'an-ready.** Mufradaat teaches Fusha and nothing else. There is no dialect, not even as an optional track. The reading path goes all the way to Qur'anic script, and the vocabulary deliberately includes the most frequent Qur'anic words.

The following are directions in progress, not promises yet:

- Learning words as root families (k-t-b → kitāb, kātib, maktab).
- Replacing the synthetic voice with human recordings.

## Operating Context

- Learners follow a winding learning path (Lernpfad). Each section is a stretch of road with its own surface and ends at a goal-sentence sign. Each stop shows its own Arabic word, and the current stop carries the Mim mark.
- A lesson is 12–15 mixed tasks, about 3–5 minutes. The types run from recognising and building to producing: hearing letters, picking meanings, building sentences from tiles, choosing endings, dictation with an Arabic keyboard, and repeating aloud. Speech recognition starts at S8, where the browser supports it.
- Grammar arrives as a short tip card before the first task that needs it: one example and one sentence of explanation, in plain German.
- Spaced repetition runs in the background. Due words appear on the home screen ("Heute dran", "Wiederholen").
- Around the path: games (letters: Buchstaben-Regen, Kalligrafie, Buchstaben-Magnet, Funkenflug; words and sentences: Hörübung, Paare zuordnen, Wort-Blitz, Satz-Zug, Im Suq, Wort-Rakete, and Tauziehen for two players on one phone), the AI practice partner (see below), flashcards, a searchable word list, favourites, an alphabet reference, badges, stats, and daily XP goals with a streak.
- Content is made stage by stage. Claude drafts it, the owner proofreads every sentence, and then audio is generated on the owner's PC with `tools/gen-audio.mjs`.

## Capabilities and Constraints

- **Delivery:** static PWA on GitHub Pages at `xbubekir68.github.io/mufradaat/`. The app is a single `index.html` with no build step, plus `manifest.webmanifest`, a service worker for offline use, and course files in `kurs/*.json`.
- **Content Security Policy:** set in `index.html`. Scripts are self-hosted or from jsDelivr, fonts are self-hosted, and the only network targets are the Supabase project and the xbubekir server of the practice partner.
- **AI practice partner (mufradaat.AI, powered by xbu):** under Spiele, section „Gespräch“, unlocked like the flashcards (after S3). The learner picks a topic (a stage-2 Etappe with the words of its finished lessons, or an open lesson of the word list) and chats with xbubekir in Arabic, transliteration or German; replies come as Arabic with full harakat, transliteration, German, then feedback and a question. It thinks with DeepSeek V4.1 Flash through OpenRouter, paid with the owner's OpenRouter key. The app sends only the topic words and the conversation to the Edge Function `mufradaat` in the Supabase project „xbubekir AI“ (code in `xbubekir/server/mufradaat`), which checks the Mufradaat account, owns the instructions to the model, and counts messages: 60 per account and day, 600 for everyone. It needs an account (no guests), nothing is stored except the daily count, conversations live only while the app is open, and they give no XP. Every screen says the AI can be wrong; its sentences are not proofread content.
- **Accounts:** Supabase handles sign-in and the `progress` table. Guest mode keeps progress only in the browser. Users can export their data and delete their account from settings.
- **Audio:** every word, sentence, letter and syllable plays a file from `audio/` when one exists. Otherwise the device's speech engine reads it aloud. Generated files use the Azure neural voice `ar-SA-HamedNeural` as a placeholder. Recordings by the owner and native speakers they know take precedence and are being collected; for example, all ~250 syllable clips for stage 1 will be self-recorded.
- **Text:** Arabic is fully vocalized throughout stage 1. From stage 2, vowel marks on secure words fade out gradually, but sentence endings always stay fully vocalized.
- **Learning rules:** there are no hearts that end a lesson; mistakes come back at the end. Locks stay: the next lesson opens only after the previous one is done. XP and streaks stay.
- **Speech:** repeating aloud is recorded and compared on the device only. Speech recognition is optional and needs explicit consent, because the browser sends audio to Google or Apple. Firefox has no recognition, so those tasks fall back to repeat-aloud.
- **Tooling:** Node scripts in `tools/` validate words and course files, check sentences, generate audio and test the learning logic. A course-file checker enforces unique IDs, that no word appears in a sentence before it is introduced, full endings, and audio for every text.
- **Language of the product:** the interface and copy are German (`lang="de"`). Arabic content is set right-to-left with `lang="ar"`.
- **Undecided:**
  - when the new path fully replaces the old one (the old path is still live, with the new one shown as a preview);
  - whether browser speech recognition is accurate enough before stage 2;
  - a possible App Store release;
  - tajwid rules, deferred for now.

## Brand Commitments

- **Name:** Mufradaat, with the Arabic مفردات.
- **Brand assets:**
  - wordmark: `brand/mufradaat.webp`, 720×194;
  - app icons: `icons/` (favicon, 180, 192, 512 and maskable 512);
  - longer logo: `Desktop\Ebubekir Dateien\Projekte\mufradaat\logo_long.png`, outside the repo.
- **Voice:** German, informal "du", short and plain, with no textbook tone. The greeting is "Ahlan wa Sahlan".
- **Source works:** the course follows the order and grammar topics of established textbooks, but all words, sentences, dialogues and names are its own. **No book title, author or reference may appear** in the app, the legal notice, store texts or marketing.
- **Character:** a private, non-commercial learning app with no revenue, no ads, no analytics and no tracking. It is run from Austria (Salzburg).

## Evidence on Hand

- **Live app:** `index.html`. Course data for stage 1, S1–S8, is in `kurs/kurs.json` and `kurs/s1.json` to `kurs/s8.json`; stage 2 sections are in `kurs/a1.json` onwards. Each has its new words, sentences (with word IDs per block) and mini-dialogues. `tools/kurs-pruefen.mjs` checks them, and `node tools/audio-texts.mjs --fehlend` lists texts still without a recording.
- **Audio:** `audio/audio.json` and `audio/liste.csv`. The production guide is `tools/audio-anleitung.md`. Voice samples are in `audio-proben/`, which is gitignored and local only.
- **Planning docs** (Claude Docs, private):
  - "Neuer Lernpfad: Inhalte der Werke und Bauplan": course structure, exercise types, decisions from 26 Oct 2026;
  - "Mufradaat – Konkurrenzanalyse und neue Ideen": competitor comparison and roadmap.
- **Earlier reviews** (artifacts): design review, the UI pattern and accessibility audit ("Prüfbericht"), and "Verbesserungsmöglichkeiten".
- **Not available:** there are no user testimonials, learner numbers, outcome data, ratings, press or pricing. Future work must not invent any of these.

## Product Principles

1. **German speakers first.** Every explanation, memory aid and label is written for someone who thinks in German. Never translate a generic course.
2. **Fusha, with nothing diluted.** One standard language serves the script, the Qur'an and the news. Accuracy of vocalization and endings outranks speed of content production.
3. **Reading is the first win.** Script comes before vocabulary, and the reading path ends in Qur'anic text. Learners who can already read skip ahead without friction.
4. **A daily habit without punishment.** Short lessons, streaks and XP pull learners back. Hearts, lockouts and shame do not.
5. **Only what is real.** Human-proofread content, honest placeholders such as the device or AI voice until recordings exist, and no claims, numbers or social proof the product cannot back.

## Accessibility & Inclusion

- Mixed direction is the norm: German left-to-right and Arabic right-to-left, often in one row. Both must stay readable.
- Arabic with full vowel marks has to stay legible at phone sizes.
- Many devices have no Arabic system voice. The app must say so and still work, using the bundled audio files.
- The microphone and speech recognition are always optional and need consent. A "not speaking right now" option skips speaking tasks.
