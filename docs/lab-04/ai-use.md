# Lab 4: AI Use Reflection

## 1. AI Assistant Used
- **LLM / Tool (implementation, tests, review fixes, release documents)**: Claude Sonnet 5.5 (Claude Code in VS Code)
- **LLM / Tool (Sprint 4 specification and test plan, PR #37)**: the contract was drafted before implementation and revised in three review rounds; see `reviewer.md` for the rounds. *(The author confirms here which assistant produced the first draft.)*

The AI wrote code and documents; every Pull Request was reviewed and merged by a human peer (@BBINGOAL), and the author read each review before answering it.

## 2. Key Prompts Used
| Prompt Name | Example Prompt | Purpose and Result |
|---|---|---|
| Understand the review | "ลองเช็คที่ BBINGOAL comment มาสิ ทำไมทำแล้วมีข้อบกพร่องเยอะจัง" | Asked for the cause, not only the fix. The answer: the tests covered the intended path, not unsaved text, remounts, parallel requests or odd inputs. This became the checklist used for the rest of the lab |
| Fix, verify, ask for review | "งั้นแก้ให้ครบ เช็คกับ Labsheet แล้วก็ให้ bbingoal รีวิวใหม่ใช่มั้ย ถ้าใช่ก็ทำเลย" | Fixed the findings of PR #38 with a failing test first, checked the result against the labsheet, replied on the PR and asked for a new review |
| Workflow against the labsheet | "ทำตาม workflow เช็คเทียบ requirement กับ @Lab4_Labsheet.md ไปด้วยนะว่าถูกต้องแล้วก็ครบถ้วนมั้ย" | Implemented Issue #32 (Ticket workflow) in commits per step; each step was compared with the labsheet before the next one |
| Ask for the root cause | "รอบหน้าทำให้แบบไม่ต้องแก้ได้ปะ ลองเช็คดูดีๆ เทสผ่านไหม หรือจิงๆมันผิดมาตั้งแต่เริ่ม" | The AI had to answer honestly: the tests passed but the approach to "atomic" indication was wrong from the start (a larger timestamp step only looked atomic). The fix locks the Ticket row |
| Self-audit | "ระหว่างนี้ลองเช็ค workflow เทียบกับ requirement ของ @Lab4_Labsheet.md หน่อยว่ามันมีอะไรต้องแก้ไขมั้ย" | Found three real gaps: `resolvedAt` was in the spec but not on screen, a stale Requester notice, and FR-07 contradicting BR-16 |
| Next issue, economically | "ทำตาม workflow ขั้นถัดไปแบบประหยัด token นิดนึง" | Started Issue #34 with short status messages and one test run per step; it found four real accessibility gaps by writing the tests first |
| Fix by review comment | "แก้ตาม comment BBINGOAL ที" | Read the PR review, reproduced each finding with a test that fails on the old code, fixed it, replied on the PR and asked for a re-review (used for #40 and #41) |
| Release and overall check | "ทำต่อ issue สุดท้ายให้หน่อย เช็คความเรียบร้อยภาพรวมด้วยนะ" | Release Issue #35: README, closing the Final column from real test output, reviewer and AI-use records, the PDF report, and a repository-wide check |

## 3. My Reflection
*(Draft written with the assistant from the actual work; the author edits it into their own words before submitting.)*

**Specification agent.** Writing the contract before any code made the later work much faster, because every Pull Request could point at an acceptance criterion and a planned test ID. The peer review of the contract was where it paid off most: the reviewer found that I had treated "Assign" as the Ticket Owner and that an edited action could not be audited. Those would have been expensive to change after the code existed. The weak point was that some rules (for example "atomic") were written as a goal, not as a testable procedure, and the first implementation satisfied the sentence but not the behaviour.

**Coding agent.** The AI was very good at producing a lot of correct code and tests quickly, and at keeping the many documents consistent. It was weak in a specific way: it tested the path it had just built. Five of the review rounds found the same kind of defect: unsaved text lost on a status change, a form remounting, parallel requests, an inherited property name such as `constructor`, a menu click repeated on the same page, and test cleanup that could delete a database it had not created. Asking the AI "why did this happen" (not only "fix it") produced a checklist that reduced these findings in the last two Pull Requests.

**What I would keep doing.** Write the failing test first and run it against the old code to see it fail; never accept "the tests pass" as proof that the approach is right; give each Pull Request an honest list of what was and was not verified (for example the one E2E timeout that I could not reproduce); and let a different person review, because the AI and I shared the same blind spots.
