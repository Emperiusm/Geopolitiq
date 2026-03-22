[Skip to content](https://www.howtothink.ai/learn/one-idea-per-container#main-content)

## Core Primitive

A note that captures exactly one idea can be understood without its original context, linked to any argument, and recombined indefinitely — a note that captures two ideas can do none of these things reliably.

## Ninety thousand index cards and one unbreakable rule

Niklas Luhmann published 58 books and over 550 articles across four decades of academic work. He was not unusually fast. He was unusually disciplined about one structural constraint: every index card in his Zettelkasten held exactly one idea. Not one topic. Not one source. One idea — stated in his own words, complete enough to be understood without its original context.

By the time Luhmann died in 1998, his slip-box contained over 90,000 cards. That number is impressive, but it is not the point. The point is what 90,000 _atomic_ cards made possible that 9,000 longer, multi-idea documents never could have: combinatorial surprise. Luhmann wrote that the Zettelkasten "yields combinatory possibilities that can never have been planned, anticipated, or conceived that way." Cards surfaced in unexpected juxtapositions. Arguments assembled themselves from fragments written years apart. The slip-box became what Luhmann called a "communication partner" — a system capable of surprising its creator — precisely because each card was self-contained enough to be meaningful in any sequence.

This is the principle of atomic notes: one idea per container. It is the single most consequential structural decision you will make in building a personal knowledge system. Get it right, and every note you write becomes a reusable building block. Get it wrong, and your system becomes a graveyard of context-dependent fragments that only make sense where you originally filed them.

## What makes a note atomic

An atomic note satisfies three criteria simultaneously. First, it is **self-contained**: someone encountering the note without knowing when or why you wrote it can still understand the claim. Second, it is **singular**: the note makes one assertion, develops one concept, or captures one argument — not two connected by "and." Third, it is **addressable**: the note can be linked to, referenced from, and embedded in any context where its single idea is relevant.

Andy Matuschak, the researcher and designer behind one of the most rigorous public note-taking practices in the field, puts it this way: "Evergreen notes should be atomic." He draws an explicit parallel to the software engineering principle of separation of concerns — modules should be "about" one thing so they are more easily composable. Matuschak also identifies the key tradeoff: "If your notes are too broad, you might not notice when you encounter some new idea about one of the notions contained within, and links to that note will be muddied. If your notes are too fragmented, you'll also fragment your link network."

The sweet spot is a note that you can summarize in its title. If you need "and," "also," or a semicolon to describe what the note is about, it contains more than one idea. Split it.

Sonke Ahrens, in _How to Take Smart Notes_ (2017), articulates the same principle for what he calls permanent notes: "Write exactly one note for each idea and write as if you are writing for someone else." The "someone else" constraint is critical. It forces self-containment. When you write for yourself, you rely on context you happen to remember right now. When you write for a reader who lacks that context, you produce a note that still works in six months — or in a completely different argument than the one you were originally building.

## Why your brain needs this boundary

Your working memory is smaller than you think. George Miller's famous 1956 paper proposed a limit of "seven plus or minus two" items. But Nelson Cowan's research, published across multiple studies from 2001 to 2010, established that the real capacity of central working memory — stripped of rehearsal strategies and chunking — is approximately **three to five items** in young adults.

This means something precise for note-taking: when you look at a note that contains three ideas, you are already consuming your entire working memory just parsing the note. You have no cognitive capacity left to _do anything with it_ — to connect it, challenge it, or compose it with another idea.

A single-idea note, by contrast, occupies one slot. You can hold it alongside three or four other atomic notes and reason about their relationships. You can ask: does this contradict that? Does this extend that? Is there a gap between these two that needs a new note? This is the actual thinking work of a knowledge system, and it only becomes possible when your containers match the architecture of your cognition.

Miller (1956) demonstrated that chunking — grouping information into meaningful units — is how humans manage cognitive load. An atomic note _is_ a chunk. It is the largest meaningful unit that functions as a single handle for your working memory. When you force two ideas into one note, you force your brain to hold an unchunkable composite every time it encounters that note. The tax compounds across every interaction with your system.

## The software principle your notes already violate

Robert C. Martin's Single Responsibility Principle states that a software module should have "exactly one reason to change." The insight behind SRP is not about code aesthetics. It is about coupling: when a module does two things, a change to one thing risks breaking the other. The module becomes fragile in proportion to how many responsibilities it carries.

Your notes work the same way. A note titled "Atomic notes improve retrieval and enable better writing" has two reasons to change: new evidence about retrieval, or new evidence about writing quality. When you update the retrieval claim, you risk muddling the writing claim. When you link the note into an argument about search systems, you drag along an irrelevant claim about composition. The note becomes a liability in both contexts — useful in neither with full confidence.

Martin's principle also prescribes the fix: "Gather together the things that change for the same reasons. Separate those things that change for different reasons." Applied to notes, this means one idea per container, because each idea evolves on its own timeline and connects to its own network of arguments.

The parallel runs deeper than analogy. Software engineers discovered that small, single-purpose functions are easier to test, easier to reuse, and easier to compose into larger systems. The exact same dynamics apply to notes. An atomic note is testable (you can verify or falsify its single claim), reusable (it slots into any argument where that claim matters), and composable (it combines with other atomic notes to produce arguments larger than any single note).

## Atomicity enables combinatorial innovation

Here is the deeper reason this principle matters: atomic units are the prerequisite for recombination, and recombination is how new ideas are born.

Joseph Schumpeter argued in 1911 that innovation is fundamentally a process of "new combinations" — taking existing elements and assembling them in configurations that did not previously exist. W. Brian Arthur extended this into a full theory in _The Nature of Technology_ (2009), demonstrating that all technologies are combinations of earlier technologies, and that "with more devices there is an exponentially growing number of ways to combine them."

The parallel to knowledge work is exact. Each atomic note is a device — a self-contained unit of meaning. Ten multi-idea notes give you ten blobs you can arrange in a line. Ten atomic notes, each holding one idea, give you 2^10 possible combinations — 1,024 potential configurations. The combinatorial space explodes when the units are genuinely atomic.

This is why Luhmann's 90,000 single-idea cards produced 58 books while most academics with extensive notes publish a fraction of that output. The cards were not impressive because they were numerous. They were impressive because each one was a genuine atom — a unit that could combine with any other unit without dragging along irrelevant context. Luhmann did not need to plan what each card would become. He placed single ideas into the system and let the system reveal combinations he could not have anticipated.

Ahrens captures this precisely: permanent notes, each containing one idea in your own words, connected by context rather than category, compose into arguments that are larger than any single note. The creative output is not stored in any individual card. It emerges from the connections between cards. And connections only work cleanly when the things being connected are genuinely atomic.

## Atomic notes and AI: why granularity is the interface layer

The rise of retrieval-augmented generation (RAG) has made atomicity a technical requirement, not just a cognitive preference. When an AI system retrieves context from your notes to answer a question, it works by converting your notes into vector embeddings and finding the nearest semantic matches. If your notes each contain one idea, the retrieval is precise — the system pulls back exactly the relevant claim. If your notes contain three ideas, the embedding is a blurred average of all three, and retrieval becomes noisy.

Modern RAG architectures in 2025-2026 increasingly combine vector search with knowledge graph structures — what the research community calls GraphRAG. These systems map relationships between concepts: what supports what, what contradicts what, what extends what. Atomic notes map directly onto knowledge graph nodes. Multi-idea notes do not, because a node needs to represent one thing to have clear edges.

This means that the one-idea-per-container principle, developed by Luhmann in the 1950s with paper index cards, turns out to be the optimal unit of knowledge for AI-assisted thinking in the 2020s. The reason is structural: both human cognition and machine retrieval work best when the units of meaning are self-contained, singular, and addressable.

If you build your note system around atomic notes today, you are building an asset that will become more valuable as AI tools improve. Every note is a node in a knowledge graph that AI can traverse. Every link between notes is an edge that AI can reason over. Every atomic claim is a chunk that fits cleanly into a retrieval window. The people who will benefit most from AI-assisted knowledge work are those whose knowledge is already structured for recombination — one idea per container, linked to everything relevant, dragging along nothing irrelevant.

## The test you can apply right now

Here is a concrete heuristic: after writing any note, read the title. If the title accurately summarizes the note's content in a single declarative sentence, the note is probably atomic. If the title needs a conjunction, a list, or a qualifier, the note probably contains more than one idea.

Some atomic note titles that work:

- "Working memory holds 3-5 items without rehearsal (Cowan 2001)"
- "Luhmann's Zettelkasten enabled combinatorial surprise through atomic cards"
- "The Single Responsibility Principle applies to notes, not just code"

Some note titles that reveal non-atomic content:

- "Working memory limits and their implications for note design"
- "Zettelkasten history and principles"
- "Software patterns that apply to knowledge work"

The first set contains claims. Each claim can be true or false, linked or unlinked, used or unused — independently. The second set contains topics. Topics cannot be true or false. They can only be "covered," which means they invite you to keep adding ideas until the note becomes a miniature essay about many things, linkable to none of them cleanly.

Write claims, not topics. One claim per container. This is the structural foundation that makes everything else in your knowledge system possible.

In the next lesson, you will confront the problem that atomicity creates: when you have hundreds or thousands of single-idea notes, you need a way to tell them apart and find them again. That is why unique identifiers prevent confusion — and why [Unique identifiers prevent confusion](https://www.howtothink.ai/learn/unique-identifiers-prevent-confusion) is the natural next step from here.

Practice

## Split Compound Notes into Atomic Units

Practice the one-idea-per-container principle by finding compound notes in your vault and splitting them into atomic, independently linkable units.

15 minutesBeginner

Method: [Atomic Note-Taking](https://www.howtothink.ai/tools/methodology/atomic-note-taking)Tool: [Obsidian](https://www.howtothink.ai/tools/software/obsidian)

1. 1Open Obsidian and find your 5 most recent notes. For each one, ask: does this note contain exactly one idea I could explain in a single sentence?
2. 2Identify any note that contains two or more distinct ideas — look for "and," "also," semicolons, or topic shifts within the note.
3. 3Split each compound note into separate atomic notes. Give each new note a clear title that states the single claim: "Retry logic and timeout handling share a pattern" becomes two notes — "Retry logic follows exponential backoff pattern" and "Timeout handling follows exponential backoff pattern."
4. 4Link the split notes to each other using Obsidian's \[\[wikilinks\]\]. The relationship between them is now explicit rather than hidden inside a compound note.
5. 5Count: you should end with more notes than you started with. Each one should be a standalone unit you could drop into any future argument without dragging in unrelated context.

Completing this practice unlocks

[Concept Mapping](https://www.howtothink.ai/tools/methodology/concept-mapping) [Progressive Summarization](https://www.howtothink.ai/tools/methodology/progressive-summarization) [Spaced Repetition](https://www.howtothink.ai/tools/methodology/spaced-repetition) [Notion](https://www.howtothink.ai/tools/software/notion)

Frequently Asked Questions

## Common questions about this lesson

What is atomic notes?

What is zettelkasten?

What is one idea per note?

What is evergreen notes?

How do I practice atomic notes?

Why does atomic notes fail?

What does it mean that one idea per container?