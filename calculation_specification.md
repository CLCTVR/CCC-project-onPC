# Q7 App: Calculation Specification

This document is the single source of truth for the Q7 Values Profile calculation logic. It details the inputs, formulas, and outputs required to generate a user's profile.

---

## 1. Inputs

The calculation begins with the user's answers to 7 questions. Each answer is a numerical value from 1 to 100, represented by variables `q1` through `q7`.

- **q1:** Green Peace (1) vs. White House staff (100)
- **q2:** Fight climate change (1) vs. Nobel Prize (100)
- **q3:** Win the Olympics (1) vs. Coach local team (100)
- **q4:** Enjoy speeding (1) vs. Respect speed limit (100)
- **q5:** Attend church (1) vs. Bungee jumping (100)
- **q6:** Freelance (1) vs. Steady 9-to-5 (100)
- **q7:** An adventure (1) vs. A safe trip (100)

---

## 2. Formulas: Raw Value Scores

The 7 inputs are used to calculate 9 "raw" value scores.

-   `UN` (Universalism) = `( (101 - q1) + (101 - q2) ) / 2`
-   `BE` (Benevolence) = `q3`
-   `TC` (Tradition/Conformity) = `( (101 - q5) + q4 ) / 2`
-   `SE` (Security) = `( q6 + q7 ) / 2`
-   `PO` (Power) = `q1`
-   `AC` (Achievement) = `( q2 + (101 - q3) ) / 2`
-   `HE` (Hedonism) = `101 - q4`
-   `ST` (Stimulation) = `( q5 + (101 - q7) ) / 2`
-   `SD` (Self-Direction) = `101 - q6`

---

## 3. Outputs

The 9 raw scores are processed to produce three final data points for the user's profile.

### Output 1: `rankedScores`

A numeric array of 9 scores, each scaled to a value between 1 and 10. This is used for the radar chart.

**Process:**
1.  Assemble the 9 raw scores into an array in the primary clockwise order: `[UN, BE, TC, SE, PO, AC, HE, ST, SD]`.
2.  Find the minimum (`minScore`) and maximum (`maxScore`) values within that array.
3.  Apply a scaling formula to each raw score to convert it to its final ranked score:
    `rankedScore = 1 + 9 * (rawScore - minScore) / (maxScore - minScore)`
    *(Edge Case: If all scores are identical, `maxScore` equals `minScore`. In this case, every `rankedScore` should default to 5.5.)*

### Output 2: `starCoords`

An object containing `{x, y}` coordinates for plotting the user's unique star on the collective map.

**Process:**
1.  Each of the 9 values corresponds to a fixed angle on a circle, treated as a vector direction. The angles (in radians, measured counter-clockwise from the positive x-axis) are fixed and correspond to the primary order:
    - `UN`: 1.222 (70°)
    - `BE`: 0.524 (30°)
    - `TC`: 6.109 (350°)
    - `SE`: 5.411 (310°)
    - `PO`: 4.712 (270°)
    - `AC`: 4.014 (230°)
    - `HE`: 3.316 (190°)
    - `ST`: 1.920 (110°)
    - `SD`: 2.618 (150°)
2.  For each value, its `rankedScore` (from Output 1) is treated as the magnitude (or force) of that vector.
3.  The final `x` and `y` coordinates are the sum of the components of all 9 vectors:
    -   `totalX = Σ (rankedScore_i * cos(angle_i))`
    -   `totalY = Σ (rankedScore_i * sin(angle_i))`
4.  The final output is `{ x: totalX, y: totalY }`.

### Output 3: `profileCode`

A 9-digit string that serves as a unique identifier for the profile shape.

**Process:**
1.  Create a list of the 9 values and their corresponding `rankedScores`.
2.  Sort this list in descending order based on the `rankedScore`. The value with the highest score gets rank #1, the second highest gets #2, and so on.
3.  Create a mapping of each value name (e.g., "UN") to its calculated rank (1-9).
4.  Arrange the ranks in the primary clockwise order used throughout the application: `UN, BE, TC, SE, PO, AC, HE, ST, SD`.
5.  Concatenate the ranks in this specific order to form the final 9-digit string.
    *Example: If UN is rank 2, BE is rank 7, and TC is rank 4, the code would begin "274...".*