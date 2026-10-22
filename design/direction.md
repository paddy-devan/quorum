# Quorum interface

Reference: `quorum-concept.png`. The game uses a paper background (#f7f7f2), forest ink (#203c32), sage lines (#d9ded5), serif display type (Georgia) and system sans-serif controls. Cards use 8px corners, flags, a region clue and an explicit selection tick. No external fonts, decorative artwork or asset requests are needed at runtime. Country flags are native emoji: factual identifiers rather than generated artwork.

Desktop: restrained masthead, date/puzzle metadata, headline and objective, a nine-row requirement rail alongside a three-column country grid, followed by the selection/check bar. Mobile: compact numbered requirement rows (per user feedback) and three-column cards, with a sticky check bar. Use the same component families for feedback and results. Dialogs use the same palette and typography.

Primary copy: Quorum; How to play; A world of possibilities.; Choose countries that together meet all 9 requirements. Can you do it in 3?; Requirements; Check selection; A little knowledge. A little logic. A smaller Quorum.

Necessary deviations from the visual concept: actual UTC dates and puzzle numbers; puzzle-specific requirements, as the illustrative nine in the concept cannot all be covered by three shown countries; more precise regional clues; continent requirements explicitly include transcontinental countries. Add country/selection headings, an inline first-play example, check history, finish/reveal, and local testing controls as required by the brief. No laptop/phone device frame in the real app. The first state starts with no country selected.
