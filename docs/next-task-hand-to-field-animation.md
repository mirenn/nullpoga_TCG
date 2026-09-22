# Next Task: Summon Animation (Hand-to-Field Flight) & Phase-based State Management

## 1. Requirement & Background

- **Feedback**:
  > "Having the card appear in the slot right from the start doesn't match the vision. Cards should fly from the hand onto the field with an animation, staying in their proper place (the hand) until they are summoned."
- **Issue**:
  - Currently, when cards are planned via Drag & Drop, they tentatively sit in the standby slot. Upon submission (`handleActionSubmit`), they remain rendered directly in the slot before the summon step animation even begins.
  - As a result, the summon moment feels like "a card that was already sitting in the slot simply glows", lacking the dynamic card flight feel characteristic of digital TCGs.

---

## 2. Target Specifications & User Experience

### Phase 1: State Immediately Post-Submit until Summon Resolution
- When action submission completes and animation sequence begins, **cards scheduled for summon must still visually reside in the player's hand**, and target Standby Zones must remain empty.
- Both player and CPU cards should start at their initial turn-start positions.

### Phase 2: Summon Step Execution (Hand-to-Field Flight)
1. **Summon Announcement**:
   - Banner displays: `"【Summon】You summoned 'Mouse (ネズミ)'!"`
2. **Flight Animation from Hand to Field**:
   - The card element in hand (or an animated clone overlay) smoothly transitions and scales toward the destination Standby Zone slot (`player-szone-${idx}`).
   - The same applies to opponent (BOT) summons: flight from opponent hand area to their standby slot.
3. **Landing & Placement Pulse**:
   - Upon reaching the slot, the slot emits a cyan/gold glow pulse.
   - The card materializes inside the Standby Zone slot.
   - The card is simultaneously removed from the hand.

---

## 3. Implementation Approaches

### Approach A: FLIP / Absolute Coordinate Flight Overlay (Recommended)
- Use `getBoundingClientRect()` to compute starting hand card coordinates and target standby slot coordinates.
- Spawn a temporary floating overlay card with CSS `transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.6s`.
- On transition completion callback, commit card to `boardState.standbyZone` and remove the overlay.

### Approach B: Motion Library (`framer-motion`)
- Use `layoutId` or declarative motion components between hand elements and target field slots.

### Game State Orchestration (`GameClient.tsx`)
- At the start of `handleActionSubmit` playback, initialize a snapshot where planned summon cards remain in hand.
- When stepping through `act.actionType === 'SUMMON_MONSTER'`, trigger the flight animation sequence and wait for it before proceeding to subsequent steps.

---

## 4. Target Files to Modify
1. `packages/web/src/components/GameClient.tsx`:
   - Pre-summon initial state setup and playback step synchronization.
2. `packages/web/src/components/GameBoard.tsx` / `packages/web/src/components/Hand.tsx`:
   - Slot coordinate refs/IDs and flight origin references.
3. `packages/web/src/app/App.css` or dedicated effect overlay:
   - Flight trajectory and landing pulse styles.
