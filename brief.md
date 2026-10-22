# Quorum — Initial Development Brief

## 1. Project overview

**Project:** Quorum  
**Type:** Daily, browser-based knowledge and logic puzzle  
**Deployment:** Cloudflare Workers  
**Stage:** Initial playable MVP

Build a polished, mobile-first daily puzzle game called **Quorum**.

The objective is to select the smallest combination of real-world entities that collectively satisfy a set of requirements.

For example, the player might be presented with twelve countries and nine geographical, cultural or historical attributes. They must find a combination of countries that collectively covers all nine attributes using as few countries as possible.

Quorum combines three forms of challenge:

- **Knowledge:** Recognising factual relationships between real-world entities and attributes.
- **Deduction:** Identifying complementary entities and reasoning about which combinations might work.
- **Optimisation:** Finding the smallest possible combination rather than merely a valid one.

The game should be immediately approachable but reward careful thought. It should encourage players to return each day, improve their results and compare their performance with others.

### Product philosophy

The daily-game market is crowded, and many functional games attract relatively little traffic. Research into more successful games suggests several valuable design principles:

1. Players should understand the objective within approximately 10–15 seconds.
2. The core interaction should be satisfying without extensive instructions.
3. Players should be rewarded for partial progress rather than simply told they are wrong.
4. Results should provide opportunities for discovery, surprise and learning.
5. The same daily challenge should be played by everyone, enabling meaningful comparison.
6. Results should be easy to share without revealing the solution.
7. Secondary features must not distract from the core game.
8. Difficulty should be consistent enough to encourage habitual play.

These are design hypotheses to test, not guarantees of success.

**The priority is an excellent core puzzle experience, not an extensive feature set.**

---

## 2. Core gameplay

### Initial rules

Use these parameters for the initial implementation. Keep them configurable so that they can be adjusted following playtesting.

| Parameter | Initial value |
|---|---|
| Candidate entities | 12 |
| Attributes to cover | 9 |
| Optimal solution | 3 entities |
| Maximum selected entities per check | 5 |
| Checks available | 3 |
| Daily puzzles | One shared puzzle per UTC day |
| Primary score | Fewest entities in a verified complete solution |

### Gameplay sequence

**Step 1 — View the puzzle**

The player sees:

- Today's theme and puzzle number.
- Nine clearly displayed requirements.
- Twelve selectable entity cards.
- A short instruction explaining the objective.
- The number of checks available.

The opening screen should immediately invite interaction. Do not require players to navigate through menus or read lengthy instructions.

**Step 2 — Select a combination**

The player selects up to five entity cards.

Cards should provide clear selected and unselected states. Selections can be changed freely before submitting a check.

No live coverage information should be displayed while selecting cards. The player must reason about which combination might satisfy the requirements.

**Step 3 — Check the combination**

The player submits their selected combination.

The game responds with:

- The number of requirements covered.
- Which requirements are satisfied and which remain uncovered.
- Whether the combination covers all nine requirements.
- The number of checks remaining.

The result should be presented through satisfying, concise animations.

Do not initially reveal every individual entity-to-attribute relationship during this process. Preserve useful information for the final explanation.

**Step 4 — Improve the solution**

The player may revise their selection and use another check.

A complete solution remains valid even if a subsequent attempt is unsuccessful.

For example:

- Check 1: Four entities cover seven requirements.
- Check 2: Four entities cover all nine requirements.
- Check 3: Three entities cover all nine requirements.

The player's final result is three entities.

If check 3 had failed, their four-entity solution from check 2 would remain their best result.

**Step 5 — Finish and reveal**

The game ends when the player:

- Uses all three checks, or
- Explicitly chooses to finish early.

Display their best result, a breakdown of the relevant factual relationships, and a spoiler-free sharing option.

### Scoring

Keep scoring deliberately simple.

- **Perfect Quorum:** All requirements covered using three entities.
- **Complete Quorum:** All requirements covered using four or five entities.
- **Incomplete:** No fully valid combination found. Show the best partial coverage.

For incomplete results, prioritise coverage count, using fewer entities as a secondary distinction.

Do not introduce arbitrary numerical bonuses, multipliers or penalties in the MVP.

---

## 3. Factual themes and puzzle content

Quorum's distinguishing feature should be its use of real-world entities and relationships rather than purely abstract symbols.

The initial theme should be **countries**.

Possible attributes include:

- Located in Africa.
- Crosses the equator.
- Landlocked.
- Portuguese is an official language.
- Drives on the left.
- Has territory in the Southern Hemisphere.
- Borders the Mediterranean.
- Contains a recognised UNESCO World Heritage Site.
- Uses the euro.

These are examples, not an exhaustive or mandatory set. Avoid vague or overly broad definitions.

### Knowledge-based interaction

Not every relationship should be explicitly shown before the player makes a selection.

Use a partial-clue approach initially:

- Show the entity's name and a suitable visual identifier, such as its flag.
- Optionally display one or two relevant factual hints.
- Leave other relevant attributes for the player to infer.
- Reveal the full relevant relationships and explanations after the game.

This should balance knowledge, deduction and accessibility.

The clue system should be configurable. Future experiments may compare fully hidden relationships, partial clues and fully visible relationships without changing the underlying puzzle engine.

### Data quality

Factual correctness is essential.

Relationships must have clear definitions, and disputed or ambiguous relationships should be avoided.

The puzzle content model should support:

- Entities and their display metadata.
- Attributes and their definitions.
- Verified entity-to-attribute relationships.
- Optional visible clues.
- Explanations of factual relationships.
- Source references where appropriate.
- Content versioning.

A missing relationship in an external dataset must not automatically be treated as a false relationship.

For the MVP, use a small set of manually verified puzzle fixtures. Do not generate fictional facts, rely on live AI responses, or implement automatic Wikidata ingestion yet.

### Content architecture

Separate factual content from game logic.

A new theme should eventually be introduced primarily through content and configuration rather than bespoke gameplay code.

The system should be capable of accommodating future themes such as animals, cities, films, historical figures and everyday objects.

It should also support abstract-symbol puzzles internally for development and testing, even though factual puzzles are the intended public-facing experience.

---

## 4. Puzzle generation and validation

**A sophisticated procedural puzzle generator is explicitly outside the initial scope.**

Build a lightweight content-loading mechanism that supports manually defined puzzles and a placeholder generation interface.

The architecture should eventually support automated puzzle generation using structured entity-to-attribute relationships.

### Planned generation approach

The eventual generator should:

1. Select an appropriate theme and set of attributes.
2. Identify a combination of entities that covers every attribute.
3. Add plausible alternatives and distracting candidates.
4. Evaluate all possible combinations.
5. Reject puzzles with undesirable solution properties.
6. Estimate logical difficulty and factual knowledge difficulty.
7. Output a validated puzzle with its solution and metadata.

### Validation requirements for the MVP

Although generation can be a placeholder, implement a genuine, tested puzzle validator.

It should determine:

- Whether every attribute is covered by a selection.
- The minimum number of entities required to solve a puzzle.
- All optimal solutions.
- Whether a puzzle is solvable under its configured limits.
- The number of valid and near-optimal solutions.

With twelve candidates, exhaustive enumeration is computationally inexpensive.

For initial authored puzzles, require a three-entity optimum and no solution using fewer than three entities.

### Future difficulty evaluation

Design the generator interface to support quality metrics such as:

- Number of optimal solutions.
- Number of plausible near misses.
- Frequency of each attribute.
- Overlap between cards.
- Redundant or dominated candidates.
- Factual familiarity.
- Estimated human difficulty.

Do not attempt to optimise all these metrics in the MVP.

The initial implementation only needs a clean way to add or replace the generator later.

---

## 5. User interface and experience

The game should feel like a modern, purpose-built daily puzzle rather than a technical demonstration.

### Visual direction

- Clean, restrained, distinctive visual design.
- Mobile-first layout.
- Clear typography and strong readability.
- Visually identifiable cards.
- Consistent use of colour and iconography.
- Subtle animations that reinforce game events.
- Accessible states that do not rely on colour alone.

Avoid excessive decoration or elaborate animations that delay interaction.

### Main game screen

The screen should prominently display:

1. Game title and daily puzzle identifier.
2. Theme and brief objective.
3. The nine attributes or requirements.
4. Twelve selectable cards.
5. Selection count and checks remaining.
6. A clear primary Check action.

On mobile, the interface should remain easy to understand without excessive scrolling.

Cards should have sufficiently large touch targets. Where practical, the currently selected combination should remain readily visible.

### First-time user experience

Provide a short interactive tutorial or similarly lightweight explanation.

The first experience should demonstrate the relationship between entities, attributes and coverage.

Avoid a separate multi-screen onboarding process.

A returning player should be able to begin immediately.

### Feedback and results

Checking a selection should produce an enjoyable reveal, showing the covered requirements.

After finishing, provide:

- Best result.
- Number of checks used.
- A visual breakdown of coverage.
- An explanation of the relevant facts.
- A spoiler-free shareable summary.

For factual explanations, the interface should help players understand *why* a combination worked rather than only reporting that it worked.

### Sharing

Implement a simple result-sharing feature that produces a compact text result with:

- Quorum puzzle number.
- Best result.
- Check progression.
- Link to the game.

Use native sharing where supported, with copy-to-clipboard as a fallback.

Do not reveal the correct entity combination in the shared result.

---

## 6. Technical architecture

### Deployment constraint

The application must deploy to **Cloudflare Workers**.

The specific frontend framework and internal libraries are flexible. Choose a straightforward, well-supported stack that suits the application.

Prioritise:

- Low operational cost.
- Fast loading.
- Simple deployment.
- Maintainability.
- Good testability.
- Clear separation of concerns.
- Ease of extending the application.

This is a relatively lightweight, interaction-driven puzzle game. Avoid introducing a game engine unless there is a concrete reason to use one.

### Suggested architecture

A suitable implementation would contain:

**Frontend**

Responsible for rendering the puzzle, card selection, animations, tutorials, progress presentation and results.

**Game domain logic**

Pure functions implementing coverage calculations, result ranking, puzzle validation and related rules.

Keep this logic independent of the UI framework and persistence layer.

**Puzzle content layer**

Loads puzzle definitions and theme-specific data from structured files or another repository abstraction.

**Backend API**

A Cloudflare Worker responsible for authoritative check evaluation, anonymous progress persistence, game completion and future user-facing services.

**Persistence**

Prefer Cloudflare D1 for persistent gameplay records. Use schema migrations.

Do not introduce multiple storage products without a clear reason.

### Game state

A player's daily progress should survive page refreshes and revisits.

Use an anonymous, persistent identifier for the initial version, with an appropriate secure session mechanism where required.

The application should distinguish:

- Puzzle definitions.
- Player identity.
- Individual puzzle sessions or runs.
- Submitted checks.
- Completed results.

Do not embed user-specific state directly into the puzzle definitions.

The server should validate checks and enforce normal gameplay rules, including the check limit. Do not rely exclusively on client-supplied claims when recording results.

Recognise that strong anti-cheat protection is not realistic for anonymous casual play. Keep reasonable safeguards proportionate to the application.

### Deployment and environments

Provide:

- Local development commands.
- Cloudflare Workers configuration.
- A reproducible production build.
- Environment-specific configuration.
- Database migrations, if applicable.
- A documented deployment process.

Use contemporary Cloudflare Workers practices and supported tooling.

Avoid infrastructure complexity that is unnecessary for an MVP.

---

## 7. Future accounts and social features

Although accounts and social functionality are **not required in the MVP**, the architecture must allow them to be added without rewriting the core gameplay or losing existing results.

Potential future capabilities include:

- User registration and login.
- Linking anonymous history to a registered account.
- Cross-device progress synchronisation.
- Personal statistics and streaks.
- Historical puzzle results.
- Friends and comparison groups.
- Daily result distributions.
- Leaderboards.
- Achievements.
- Social profiles.

### Architectural expectations

Design with these extensions in mind:

**Identity**

Do not assume every player will permanently remain anonymous. Support a distinction between an anonymous participant and a future authenticated user.

**Persistence**

Associate game runs and results with stable identifiers. Do not store all progress in an unstructured client-side blob.

**Game logic**

Keep scoring, validation and completion logic independent of the future authentication system.

**API design**

Use clearly separated routes and services so that authenticated features can be introduced incrementally.

**Security**

Do not trust client-submitted scores or completed solutions.

**Historical compatibility**

Give puzzles stable identifiers and versions so that old results remain interpretable after puzzles or scoring rules change.

Avoid implementing an authentication framework, social graph, leaderboard infrastructure or elaborate permissions system prematurely.

The goal is to **avoid architectural dead ends, not to build the future features now**.

---

## 8. Analytics and product measurement

Quorum's commercial viability depends more on player acquisition and retention than on technical complexity.

Include lightweight, privacy-conscious analytics from the outset.

Measure at least:

- Daily visitors.
- Players who start a puzzle.
- Players who submit their first check.
- Players who finish.
- Completion rate.
- Distribution of final outcomes.
- Returning players.
- Sharing actions.

If practical, distinguish first-time players from returning players through their anonymous identifiers.

An elaborate analytics dashboard is not required. Basic events and inspectable queries are sufficient.

Avoid storing unnecessary personal information.

The intention is to support decisions about difficulty, first-play friction, retention and distribution using actual player behaviour.

---

## 9. Scope boundaries

### Required for the MVP

- Deployable Cloudflare Workers application.
- Responsive playable Quorum interface.
- Country-themed factual puzzles.
- Manually authored and validated puzzle fixtures.
- Entity selection and three-check gameplay.
- Coverage feedback after checks.
- Best-result retention.
- Results screen with factual explanations.
- Basic sharing.
- Anonymous persistence across refreshes.
- Simple gameplay and retention instrumentation.
- Reusable game logic.
- Placeholder puzzle generation interface.
- Tests for critical rules and puzzle validation.
- Basic documentation for development, deployment and adding puzzles.

### Explicitly deferred

- Sophisticated procedural puzzle generation.
- Live integration with Wikidata or other external knowledge sources.
- AI-generated factual content.
- User registration and authentication.
- Friends, leaderboards and social profiles.
- Monetisation and advertisements.
- Multiple concurrent game modes.
- Complex achievements and progression.
- Elaborate content-management systems.
- A dedicated administration portal.

### Optional enhancements

Only consider these after the core gameplay is complete:

- Aggregate result distributions using real recorded results.
- An archive of previous puzzles.
- Additional factual themes.
- Alternative clue-reveal configurations.
- An enhanced first-time tutorial.

Do not allow optional features to delay the playable MVP.

---

## 10. Testing and acceptance criteria

The initial implementation should satisfy the following conditions.

### Gameplay

- A player can complete a puzzle from start to finish.
- The game correctly evaluates every submitted combination.
- The configured maximum number of checks is enforced.
- No live coverage feedback is exposed while selecting cards.
- A successful result remains valid after an unsuccessful later check.
- Completion and incomplete outcomes are handled correctly.
- The player can review their result and factual explanations.
- A completed daily game cannot accidentally be restarted as a fresh session merely by refreshing.

### Puzzle integrity

- Fixtures can be loaded without modifying the game engine.
- Every published puzzle is validated.
- The solver correctly identifies all minimum-card solutions.
- Invalid puzzles are rejected or flagged before publication.
- Every factual relationship used in authored puzzles has been verified.

### Technical

- The application runs locally.
- Production deployment to Cloudflare Workers is documented and functional.
- The interface works well on mobile and desktop.
- Game rules have automated unit tests.
- Relevant backend routes have tests.
- Persistence is implemented through a clear abstraction.
- The application can accommodate future authenticated users.

### Product

- A new player can understand the basic objective without reading extensive documentation.
- The first meaningful interaction is immediately accessible.
- Failed checks provide understandable, constructive feedback.
- The result screen feels like a satisfying conclusion.
- Sharing a result does not spoil the solution.

---

### Instructions for the coding agent

- Make sensible technical decisions independently, choosing simplicity unless additional complexity provides a tangible benefit.
- Use clean boundaries between UI, gameplay, factual content, backend and persistence.
- Avoid unnecessary abstractions, excessive helper layers and premature extensibility.
- Write readable, well-structured code that can be understood and maintained by another developer.
- Prefer configuration-driven content over hard-coded puzzle-specific logic.
- Document material architectural decisions and trade-offs.
- Do not build features beyond the agreed MVP without a clear justification.
- Where gameplay requirements are genuinely ambiguous, prioritise consistency, fairness and ease of understanding.
- Ensure that the initial puzzle generator remains replaceable without changing core gameplay.
- Maintain a clear distinction between implemented behaviour, placeholder behaviour and planned capabilities.

**Definition of success:** A polished, fully playable, daily knowledge-and-optimisation puzzle that can be deployed cheaply, measured effectively, and extended incrementally as real player feedback becomes available.

The long-term ambition is to create a daily game with broad appeal and strong retention. The immediate objective is to prove that the central Quorum mechanic is genuinely enjoyable.