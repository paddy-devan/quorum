# Puzzle quality report

Catalog: **countries-4-quality**. Profile: **daily-testing v1**. Overall audit: **PASS**.

This authoring report contains answers. Difficulty and familiarity are editorial estimates; solution counts describe the board, not observed player scores.

Algorithm: **seeded-safe-route-v1**. Seed: **20261022**. Accepted **7/7** after **4479/100000** attempts. Exhausted: **false**.

Stages count each attempt once. Rejection counts count each failed check once per attempt, so they can sum to more than the number of attempts.

| Final stage | Attempts |
| --- | ---: |
| eligibility | 1713 |
| country-mix | 134 |
| safe-route | 428 |
| requirement-mix | 2003 |
| quality | 192 |
| accepted | 7 |
| schedule-diversity | 2 |

| Rejection | Attempts |
| --- | ---: |
| eligible-count | 1713 |
| familiarity-count | 134 |
| safe-route-proposal | 428 |
| subject-count | 567 |
| difficulty-count | 1688 |
| optimum | 109 |
| implied-requirement | 153 |
| family-count | 76 |
| optimal-count | 112 |
| completion-rate | 111 |
| matching-countries | 112 |
| irreducible-count | 11 |
| schedule-diversity | 2 |

The JSON includes 30 detailed attempt traces; 4449 further traces were omitted by the configured trace limit.

## Active constraints

```json
{
  "id": "daily-testing",
  "version": 1,
  "candidateCount": 12,
  "requirementCount": 6,
  "maxSelected": 6,
  "maxPerFamily": 2,
  "estimationCount": {
    "min": 1,
    "max": 2
  },
  "minSubjects": 3,
  "difficultyCounts": {
    "easy": {
      "min": 1,
      "max": 4
    },
    "medium": {
      "min": 1,
      "max": 4
    },
    "hard": {
      "min": 1,
      "max": 3
    }
  },
  "familiarityCounts": {
    "familiar": {
      "min": 4,
      "max": 8
    },
    "moderate": {
      "min": 0,
      "max": 6
    },
    "less-familiar": {
      "min": 2,
      "max": 4
    }
  },
  "matchingCountries": {
    "min": 2,
    "max": 7
  },
  "optimalSize": 3,
  "optimalCount": {
    "min": 1,
    "max": 4
  },
  "completionRates": {
    "4": {
      "min": 0.05,
      "max": 0.3
    },
    "5": {
      "min": 0.15,
      "max": 0.6
    },
    "6": {
      "min": 0.3,
      "max": 0.85
    }
  },
  "minIrreducibleBySize": {
    "4": 1,
    "5": 1
  },
  "safeRouteSizes": [
    5,
    6
  ],
  "preventImplications": true,
  "maxAdjacentRequirementOverlap": 4
}
```

## Schedule

| Puzzle | Complete 3 / 4 / 5 / 6 | Irreducible 4 / 5 / 6 | Result |
| --- | --- | --- | --- |
| countries-20261022-001 | 2 / 41 / 206 / 453 | 23 / 12 / 0 | PASS |
| countries-20261022-002 | 2 / 39 / 181 / 381 | 22 / 8 / 0 | PASS |
| countries-20261022-003 | 2 / 33 / 158 / 367 | 16 / 6 / 4 | PASS |
| countries-20261022-004 | 4 / 57 / 225 / 441 | 25 / 1 / 0 | PASS |
| countries-20261022-005 | 1 / 25 / 136 / 322 | 16 / 10 / 0 | PASS |
| countries-20261022-006 | 2 / 34 / 154 / 337 | 17 / 3 / 0 | PASS |
| countries-20261022-007 | 2 / 28 / 137 / 326 | 11 / 11 / 2 | PASS |

Schedule coverage: **29/32 countries**, **21/33 enabled requirements**.

Countries absent this batch: Turkey, Australia, Senegal.


## countries-20261022-001

| Requirement | Family | Reasoning | Difficulty | Matches |
| --- | --- | --- | --- | ---: |
| Has hosted the Winter Olympics | event-hosting | recall | medium | 3 |
| Southern Hemisphere | hemisphere | recall | easy | 4 |
| More densely populated than Germany | numeric-comparison | estimation | hard | 2 |
| Has won the men’s football World Cup | sporting-achievement | recall | easy | 3 |
| Landlocked | coastal-access | recall | easy | 3 |
| More people than Japan | numeric-comparison | estimation | medium | 4 |

Familiarity: {"less-familiar":3,"moderate":5,"familiar":4}. Subjects: {"sport":2,"geography":2,"population":2}.

Excluded countries: Germany (reference country for “More densely populated than Germany”); Japan (reference country for “More people than Japan”).

| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 2 / 220 | 0.9% | 2 | 0.0% |
| 4 | 41 / 495 | 8.3% | 23 | 43.9% |
| 5 | 206 / 792 | 26.0% | 12 | 94.2% |
| 6 | 453 / 924 | 49.0% | 0 | 100.0% |

Conservative route: Austria, Chile, Netherlands, Spain, Mexico.

Optimal solutions:

- Uruguay, Austria, Nigeria
- Bolivia, Nigeria, Italy

Country answers (numbers refer to requirements in the table above):

| Country | Familiarity | Qualifies for |
| --- | --- | --- |
| Uruguay | less-familiar | 2, 4 |
| Chile | moderate | 2 |
| Spain | familiar | 4 |
| Indonesia | moderate | 2, 6 |
| Austria | moderate | 1, 5 |
| Netherlands | moderate | 3 |
| United States | familiar | 1, 6 |
| Bhutan | less-familiar | 5 |
| Bolivia | less-familiar | 2, 5 |
| Nigeria | moderate | 3, 6 |
| Italy | familiar | 1, 4 |
| Mexico | familiar | 6 |


## countries-20261022-002

| Requirement | Family | Reasoning | Difficulty | Matches |
| --- | --- | --- | --- | ---: |
| Crosses the equator | hemisphere | recall | easy | 2 |
| More people than Germany | numeric-comparison | estimation | medium | 4 |
| UNESCO Mediterranean diet heritage | cultural-recognition | recall | hard | 2 |
| In Asia | continent | recall | easy | 4 |
| GDP greater than Austria’s | numeric-comparison | estimation | medium | 6 |
| In Africa | continent | recall | easy | 2 |

Familiarity: {"familiar":4,"less-familiar":3,"moderate":5}. Subjects: {"geography":3,"population":1,"culture":1,"economy":1}.

Excluded countries: Germany (reference country for “More people than Germany”); Austria (reference country for “GDP greater than Austria’s”).

| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 2 / 220 | 0.9% | 2 | 0.0% |
| 4 | 39 / 495 | 7.9% | 22 | 43.6% |
| 5 | 181 / 792 | 22.9% | 8 | 95.6% |
| 6 | 381 / 924 | 41.2% | 0 | 100.0% |

Conservative route: Kenya, Nigeria, Greece, Mongolia, Netherlands.

Optimal solutions:

- India, Kenya, Greece
- India, Kenya, Portugal

Country answers (numbers refer to requirements in the table above):

| Country | Familiarity | Qualifies for |
| --- | --- | --- |
| France | familiar | 5 |
| Brazil | familiar | 1, 2, 5 |
| India | familiar | 2, 4, 5 |
| Kenya | less-familiar | 1, 6 |
| Bhutan | less-familiar | 4 |
| South Korea | moderate | 4, 5 |
| United States | familiar | 2, 5 |
| Netherlands | moderate | 5 |
| Nigeria | moderate | 2, 6 |
| Greece | moderate | 3 |
| Portugal | moderate | 3 |
| Mongolia | less-familiar | 4 |


## countries-20261022-003

| Requirement | Family | Reasoning | Difficulty | Matches |
| --- | --- | --- | --- | ---: |
| Capital within 2,000 miles of Cairo | capital-distance | estimation | hard | 3 |
| Has won the women’s football World Cup | sporting-achievement | recall | medium | 3 |
| Crosses the equator | hemisphere | recall | easy | 2 |
| More people than Japan | numeric-comparison | estimation | medium | 4 |
| UNESCO Tango heritage | cultural-recognition | recall | medium | 2 |
| Has hosted the Winter Olympics | event-hosting | recall | medium | 4 |

Familiarity: {"familiar":5,"moderate":4,"less-familiar":3}. Subjects: {"geography":2,"sport":2,"population":1,"culture":1}.

Excluded countries: Japan (reference country for “More people than Japan”).

| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 2 / 220 | 0.9% | 2 | 0.0% |
| 4 | 33 / 495 | 6.7% | 16 | 51.5% |
| 5 | 158 / 792 | 19.9% | 6 | 96.2% |
| 6 | 367 / 924 | 39.7% | 4 | 98.9% |

Conservative route: Spain, Kenya, Nigeria, Argentina, Italy.

Optimal solutions:

- Indonesia, Germany, Argentina
- Indonesia, Germany, Uruguay

Country answers (numbers refer to requirements in the table above):

| Country | Familiarity | Qualifies for |
| --- | --- | --- |
| Spain | familiar | 2 |
| Indonesia | moderate | 3, 4 |
| Germany | familiar | 1, 2, 6 |
| Argentina | moderate | 5 |
| Uruguay | less-familiar | 5 |
| Nigeria | moderate | 4 |
| United States | familiar | 2, 4, 6 |
| Kenya | less-familiar | 3 |
| Italy | familiar | 1, 6 |
| Slovenia | less-familiar | 1 |
| South Korea | moderate | 6 |
| Mexico | familiar | 4 |


## countries-20261022-004

| Requirement | Family | Reasoning | Difficulty | Matches |
| --- | --- | --- | --- | ---: |
| In Asia | continent | recall | easy | 5 |
| Landlocked | coastal-access | recall | easy | 2 |
| Crosses the equator | hemisphere | recall | easy | 2 |
| Capital within 1,500 miles of Paris | capital-distance | estimation | hard | 3 |
| GDP greater than Austria’s | numeric-comparison | estimation | medium | 6 |
| Has hosted the Summer Olympics | event-hosting | recall | easy | 4 |

Familiarity: {"less-familiar":3,"familiar":5,"moderate":4}. Subjects: {"geography":4,"economy":1,"sport":1}.

Excluded countries: Austria (reference country for “GDP greater than Austria’s”).

| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 4 / 220 | 1.8% | 4 | 0.0% |
| 4 | 57 / 495 | 11.5% | 25 | 56.1% |
| 5 | 225 / 792 | 28.4% | 1 | 99.6% |
| 6 | 441 / 924 | 47.7% | 0 | 100.0% |

Conservative route: Egypt, Bolivia, Kenya, Argentina, Greece.

Optimal solutions:

- Nepal, Kenya, Spain
- Nepal, Greece, Brazil
- Nepal, Spain, Brazil
- Nepal, Brazil, Portugal

Country answers (numbers refer to requirements in the table above):

| Country | Familiarity | Qualifies for |
| --- | --- | --- |
| Nepal | less-familiar | 1, 2 |
| Japan | familiar | 1, 5, 6 |
| Bolivia | less-familiar | 2 |
| Kenya | less-familiar | 3 |
| Greece | moderate | 4, 6 |
| Argentina | moderate | 5 |
| Spain | familiar | 4, 5, 6 |
| Thailand | moderate | 1, 5 |
| Brazil | familiar | 3, 5, 6 |
| India | familiar | 1, 5 |
| Egypt | familiar | 1 |
| Portugal | moderate | 4 |


## countries-20261022-005

| Requirement | Family | Reasoning | Difficulty | Matches |
| --- | --- | --- | --- | ---: |
| Has hosted the Winter Olympics | event-hosting | recall | medium | 3 |
| More densely populated than Germany | numeric-comparison | estimation | hard | 2 |
| Portuguese is official | language | recall | easy | 2 |
| Southern Hemisphere | hemisphere | recall | easy | 5 |
| In Africa | continent | recall | easy | 4 |
| Landlocked | coastal-access | recall | easy | 2 |

Familiarity: {"moderate":6,"less-familiar":2,"familiar":4}. Subjects: {"sport":1,"population":1,"culture":1,"geography":3}.

Excluded countries: Germany (reference country for “More densely populated than Germany”).

| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 1 / 220 | 0.5% | 1 | 0.0% |
| 4 | 25 / 495 | 5.1% | 16 | 36.0% |
| 5 | 136 / 792 | 17.2% | 10 | 92.6% |
| 6 | 322 / 924 | 34.8% | 0 | 100.0% |

Conservative route: France, Nigeria, Portugal, Peru, Nepal.

Optimal solutions:

- Austria, Nigeria, Brazil

Country answers (numbers refer to requirements in the table above):

| Country | Familiarity | Qualifies for |
| --- | --- | --- |
| Indonesia | moderate | 4 |
| Peru | moderate | 4 |
| Nepal | less-familiar | 6 |
| South Africa | moderate | 4, 5 |
| Egypt | familiar | 5 |
| Austria | moderate | 1, 6 |
| Japan | familiar | 1, 2 |
| Kenya | less-familiar | 4, 5 |
| Nigeria | moderate | 2, 5 |
| Portugal | moderate | 3 |
| France | familiar | 1 |
| Brazil | familiar | 3, 4 |


## countries-20261022-006

| Requirement | Family | Reasoning | Difficulty | Matches |
| --- | --- | --- | --- | ---: |
| Southern Hemisphere | hemisphere | recall | easy | 5 |
| Capital within 3,500 miles of Tokyo | capital-distance | estimation | hard | 2 |
| Uses the euro | currency | recall | easy | 3 |
| Mediterranean coast | coastal-access | recall | easy | 2 |
| Portuguese is official | language | recall | easy | 2 |
| More people than Germany | numeric-comparison | estimation | medium | 5 |

Familiarity: {"less-familiar":2,"familiar":4,"moderate":6}. Subjects: {"geography":3,"economy":1,"culture":1,"population":1}.

Excluded countries: Germany (reference country for “More people than Germany”).

| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 2 / 220 | 0.9% | 2 | 0.0% |
| 4 | 34 / 495 | 6.9% | 17 | 50.0% |
| 5 | 154 / 792 | 19.4% | 3 | 98.1% |
| 6 | 337 / 924 | 36.5% | 0 | 100.0% |

Conservative route: Kenya, Nepal, France, Portugal, Nigeria.

Optimal solutions:

- Nepal, France, Brazil
- France, Brazil, Japan

Country answers (numbers refer to requirements in the table above):

| Country | Familiarity | Qualifies for |
| --- | --- | --- |
| Nepal | less-familiar | 2 |
| Egypt | familiar | 4, 6 |
| France | familiar | 3, 4 |
| Nigeria | moderate | 6 |
| Austria | moderate | 3 |
| South Africa | moderate | 1 |
| Indonesia | moderate | 1, 6 |
| Peru | moderate | 1 |
| Brazil | familiar | 1, 5, 6 |
| Japan | familiar | 2, 6 |
| Kenya | less-familiar | 1 |
| Portugal | moderate | 3, 5 |


## countries-20261022-007

| Requirement | Family | Reasoning | Difficulty | Matches |
| --- | --- | --- | --- | ---: |
| Crosses the equator | hemisphere | recall | easy | 2 |
| Has won the men’s football World Cup | sporting-achievement | recall | easy | 4 |
| More densely populated than Germany | numeric-comparison | estimation | hard | 2 |
| Landlocked | coastal-access | recall | easy | 2 |
| Has hosted the Winter Olympics | event-hosting | recall | medium | 4 |
| In Asia | continent | recall | easy | 4 |

Familiarity: {"less-familiar":4,"familiar":6,"moderate":2}. Subjects: {"geography":3,"sport":2,"population":1}.

Excluded countries: Germany (reference country for “More densely populated than Germany”).

| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 2 / 220 | 0.9% | 2 | 0.0% |
| 4 | 28 / 495 | 5.7% | 11 | 60.7% |
| 5 | 137 / 792 | 17.3% | 11 | 92.0% |
| 6 | 326 / 924 | 35.3% | 2 | 99.4% |

Conservative route: Kenya, Uruguay, Nigeria, Bolivia, United States, Egypt.

Optimal solutions:

- Japan, Brazil, Nepal
- Japan, Brazil, Bolivia

Country answers (numbers refer to requirements in the table above):

| Country | Familiarity | Qualifies for |
| --- | --- | --- |
| Uruguay | less-familiar | 2 |
| Italy | familiar | 2, 5 |
| France | familiar | 2, 5 |
| Japan | familiar | 3, 5, 6 |
| Nigeria | moderate | 3 |
| Kenya | less-familiar | 1 |
| United States | familiar | 5 |
| Brazil | familiar | 1, 2 |
| Thailand | moderate | 6 |
| Nepal | less-familiar | 4, 6 |
| Bolivia | less-familiar | 4 |
| Egypt | familiar | 6 |

