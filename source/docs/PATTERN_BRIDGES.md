# Pattern Lab integration in Logic Quest

Pattern Lab remains an Engineering Quest module. This release implements the Logic Quest portion of Part A of `Pattern-Lab-Tweaked-LQ-Bridge-Handoff-Openable.pdf`.

- Optional Explorer Workshop: notice, stated-rule sorting, smallest repeats, and another-case reasoning.
- Thirteen preparation events across Signal Camp, Switch Caverns, Fog Marsh, Ladder Cliffs, optional Bridge of Rules/Twin Isles, Trickster Market, and Chance Dock.
- Exact shared routine: Notice → Compare → Describe → Predict → Test → Revise.
- Nineteen optimized images derived from the supplied artwork collection. Destination designs are provisional; their event IDs map to the skill-overlap table in Part A.
- Explicit Explorer, Trailblazer, and Logician selection per player. It changes the visible preparation activities and presentation, not native Logic Quest mastery.
- Native Journey cards and Arcade cards use the matching destination artwork; relevant lessons include the routine chip.
- Pattern Scout is Workshop completion. Evidence Scout requires FM-02, TM-02, and CD-02. Both are preparation badges, never native stop passes or retention claims.
- Bridge progress lives in `SaveData.patternBridge` and travels with the existing export/import. Parsing filters unrecognized event IDs and derives Evidence Scout from the saved events.

Numbers, text, shapes, exact sequence positions, options, and test results remain editable app graphics. Decorative art never changes quantities or reveals an answer.

This release does not create the full twelve-unit EQ Academy/Arcade, or award EQ Passed now/Retained status. An EQ cross-app synchronization service does not yet exist in this source; no unverified external mastery is imported. Native Proof and Junior Badge gates remain separate. Native stops that were coming soon stay coming soon; preparation activities are clearly labeled as previews.

Validation: existing 308 tests plus four bridge tests, TypeScript checking, and the Pages production build. Bridge tests cover separating inputs across 100 seeds, valid unique answer choices, old-save defaults, export/import, forged badge claims, and unchanged native progress.
