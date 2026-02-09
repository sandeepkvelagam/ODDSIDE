# @kvitt/shared-core

Shared business logic for Kvitt web and mobile applications.

## Philosophy

This package contains **pure business logic** - no UI, no framework dependencies, just functions.

- **Domain logic**: Settlement calculations, game rules
- **Validators**: Zod schemas for API responses
- **Formatters**: Currency, date, time formatting
- **Socket events**: Event payload types and reducers

## Usage

### Web (React)
```javascript
import { computeSettlement } from '@kvitt/shared-core';

const settlements = computeSettlement(players);
```

### Mobile (React Native)
```javascript
import { computeSettlement } from '@kvitt/shared-core';

const settlements = computeSettlement(players);
```

### Backend (Python) - for reference
Backend has the authoritative implementation. This package ensures web/mobile match backend logic.

## Structure

```
src/
├── domain/          # Business logic
│   └── settlement.js
├── validators/      # Zod schemas
├── formatters/      # Display formatting
├── socket/          # Event handlers
└── index.js         # Public API
```

## Testing

```bash
npm test
```

## Current Exports

### `computeSettlement(players)`

Calculates optimal debt settlement using greedy debt minimization.

**Input:**
```javascript
[
  { user_id: "user1", net_result: 150 },   // Won $150
  { user_id: "user2", net_result: -80 },   // Lost $80
  { user_id: "user3", net_result: -70 }    // Lost $70
]
```

**Output:**
```javascript
[
  { from_user_id: "user2", to_user_id: "user1", amount: 80 },
  { from_user_id: "user3", to_user_id: "user1", amount: 70 }
]
```

### `validateAllCashedOut(players)`

Checks if all players with buy-ins have cashed out.

### `validateChipCount(distributed, returned, tolerance)`

Validates chip integrity (distributed === returned).
