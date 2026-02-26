# Kvitt Polish & Brand Consistency Specification

Internal product reference. Defines the language, tone, and visual standards that make Kvitt feel like a production poker platform, not a startup MVP.

---

## 1. Product Identity

Kvitt is a poker ecosystem for serious hosts. Every word, animation, and error message should feel like a private poker room meets intelligent system.

**Target feel:** Calm. Composed. Strategic. Never surprised. Never loud.

**Not:** Banking app. Casino app. Generic SaaS. IFTTT clone.

---

## 2. Rename Decision: Automation to Smart Flows

| Criterion | Result |
|-----------|--------|
| Clear | Immediately understandable |
| Premium | Modern, intelligent |
| Not technical | No "engine", "rules", "workflow" jargon |
| International | Works across 7 supported languages |

**Implementation:** UI-facing labels changed. Internal route names (`"Automations"`) and API endpoints (`/automations`) remain unchanged.

---

## 3. Smart Flows Error Handling

**Before:** `Alert.alert("Error", "Failed to load automations")` — raw native alert, generic MVP language.

**After:** Inline error UI with retry button. No native alert for load failures.

```
Title: Smart Flows aren't available
Detail: Check your connection and try again.
Action: [Try Again] button
```

All other Smart Flows errors use contextual titles:

| Action | Error Title |
|--------|-------------|
| Toggle | Update unavailable |
| Delete | Removal unavailable |
| Test | Test unavailable |
| Replay | Replay unavailable |
| Load history | Not available right now |
| Load templates | Not available right now |
| Create | Creation unavailable |

Detail for all: "Please try again." (or API-provided detail when available).

---

## 4. Vocabulary Standards

### Navigation Labels

| Internal Key | Display Label |
|-------------|---------------|
| Dashboard | Overview |
| Settings | Preferences |
| Notifications | Alerts |
| Wallet | Wallet (unchanged) |
| Smart Flows | Smart Flows |
| Games | Games |
| Groups | Groups |
| Profile | Profile |

### Button Labels

| Context | Standard |
|---------|----------|
| Save | Save Changes |
| Edit | Update |
| Confirm | Confirm |
| Cancel | Cancel |
| Retry | Try Again |
| Transfer | Transfer |
| Collect | Collect |

### Common Terms

| Context | Standard |
|---------|----------|
| Loading | Getting things ready... |
| Success | All set |
| Error (generic) | Not available right now |
| Retry button | Try Again |
| Empty state (generic) | No activity yet |

### Error Message Tone

| Scenario | Title |
|----------|-------|
| Auth failure | Sign-in unavailable |
| Session expired | Your session has ended |
| No permission | Access restricted |
| Not found | Not available |
| Conflict | Action unavailable |
| Invalid input | Review required |
| Server error | Temporarily unavailable |
| Timeout | Request timed out |
| Network | Connection issue |
| Unknown | Not available right now |
| Update failed | Update unavailable |
| Payment failed | Payment unavailable |
| Recording failed | Recording unavailable |
| Submission failed | Submission unavailable |

### Contextual Error Titles (by domain)

| Domain | Title Pattern |
|--------|---------------|
| Wallet setup | Wallet setup unavailable |
| PIN | PIN setup unavailable / PINs don't match |
| Deposit | Deposit unavailable |
| Withdrawal | Withdrawal unavailable |
| Transfer | Transfer unavailable |
| Payment link | Payment link unavailable |
| Payment page | Payment page unavailable |
| Request | Request unavailable |
| Profile update | Update unavailable |
| Recording | Recording unavailable |
| Transcription | Transcription unavailable |
| Feedback | Submission unavailable |
| Game action | Couldn't [verb] the game. |
| Player action | Couldn't [verb] player. |
| Group | Group unavailable / Group creation unavailable |
| Settlement | Settlement unavailable |
| Balances | Balances unavailable |
| Chats | Chats aren't available right now. |

### Rules

- Never use "Error" as a title
- Never use "Failed to..." as a message
- Never use "Oops", "snag", or surprise language
- Never use exclamation marks in error states
- Under 12 words per message whenever possible
- Delete wording: unchanged
- Wallet label wording: unchanged (error *tone* upgraded)

---

## 5. Splash Screen

**Visual:** K logo only. Centered. Dark background (#282B2B). Understated orange glow.

**Animation:**
1. Fade in: 0 to 1 opacity, 300ms
2. Scale: 0.95 to 1.0, spring (friction: 8)
3. Hold: ~200ms
4. Fade out: 1 to 0 opacity, 300ms
5. Total: ~650ms

**No text. No tagline.** Poker apps imply. Fintech apps explain.

**Loading screen** (pre-auth): K logo + "Kvitt" text + "Getting things ready..."

---

## 6. Logo Placement

| Location | Format | Size |
|----------|--------|------|
| Splash screen | K icon only | Large |
| Loading screen | K icon + text | Large |
| Dashboard header | K icon + text + tagline | Default |
| App drawer | Text only | Default |

No wallet watermark. No decorative usage. Minimal branding is stronger branding.

---

## 7. Color Philosophy

| Proportion | Color | Usage |
|------------|-------|-------|
| 60% | Dark Base (#282B2B) | Backgrounds, surfaces |
| 30% | Orange (#EE6C29) | Primary attention, CTAs, brand accent |
| 10% | Blue (#3B82F6) | Secondary accent, trust indicators |

---

## 8. Internationalization

All user-facing copy supports 7 languages: English, Spanish, French, German, Hindi, Portuguese, Chinese.

Translation keys remain stable (e.g., `automations` stays as the key). Only display values change. This ensures:

- No navigation breakage
- No API misalignment
- Centralized string management via `translations.ts`

---

## 9. Microcopy JSON

A shared microcopy structure exists at `/docs/kvitt-microcopy.json` for cross-platform consistency (mobile + future web). Sections:

- `navigation` — screen labels
- `states` — loading, error titles/details
- `emptyStates` — empty screen copy
- `success` — confirmation messages
- `actions` — button labels
- `smartFlows` — Smart Flows-specific copy

---

## 10. What This Spec Does Not Cover

- Wallet UI changes (unchanged per instruction)
- Delete button wording (unchanged per instruction)
- Backend API endpoint naming
- New dependency additions
- Navigation restructuring
- Custom modal system (recommended as next upgrade)

---

## 11. Verification Checklist

- [ ] No hardcoded "Automation" in user-facing strings
- [ ] Smart Flows error shows inline UI, not native Alert
- [ ] Splash shows K logo with fade-in/scale/fade-out animation
- [ ] Loading screen shows KvittLogo + "Getting things ready..."
- [ ] All 7 languages display "Smart Flows" equivalent correctly
- [ ] No `Alert.alert("Error", ...)` anywhere in screens
- [ ] No `"Failed to ..."` in any user-facing string
- [ ] Navigation shows "Overview", "Preferences", "Alerts" (all 7 languages)
- [ ] Save button reads "Save Changes", Edit reads "Update"
- [ ] Build passes with no TypeScript errors
- [ ] Brand bible, microcopy JSON, and this spec exist in `/docs/`
