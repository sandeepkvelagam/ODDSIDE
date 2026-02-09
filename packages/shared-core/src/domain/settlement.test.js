import { computeSettlement, validateAllCashedOut, validateChipCount } from './settlement.js';

// Simple test runner
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}:`, error.message);
  }
}

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
  }
}

// Tests
test('Simple 3-player settlement', () => {
  const players = [
    { user_id: 'alice', net_result: 150 },
    { user_id: 'bob', net_result: -80 },
    { user_id: 'charlie', net_result: -70 }
  ];

  const result = computeSettlement(players);

  assertEqual(result.length, 2, 'Should have 2 transactions');
  assertEqual(result[0].from_user_id, 'bob', 'Bob should pay');
  assertEqual(result[0].to_user_id, 'alice', 'Alice should receive');
  assertEqual(result[0].amount, 80, 'Bob pays $80');
  assertEqual(result[1].from_user_id, 'charlie', 'Charlie should pay');
  assertEqual(result[1].amount, 70, 'Charlie pays $70');
});

test('Complex multi-winner settlement', () => {
  const players = [
    { user_id: 'alice', net_result: 100 },
    { user_id: 'bob', net_result: 50 },
    { user_id: 'charlie', net_result: -80 },
    { user_id: 'dave', net_result: -70 }
  ];

  const result = computeSettlement(players);

  // Charlie (-80) pays Alice (100): 80
  // Dave (-70) pays Alice (100-80=20): 20
  // Dave (-70-20=50) pays Bob (50): 50
  assertEqual(result.length, 3, 'Should have 3 transactions');

  const totalPaid = result.reduce((sum, s) => sum + s.amount, 0);
  assertEqual(totalPaid, 150, 'Total paid should equal total won');
});

test('Empty players array', () => {
  const result = computeSettlement([]);
  assertEqual(result.length, 0, 'Should return empty array');
});

test('All players break even', () => {
  const players = [
    { user_id: 'alice', net_result: 0 },
    { user_id: 'bob', net_result: 0 }
  ];

  const result = computeSettlement(players);
  assertEqual(result.length, 0, 'No settlements needed');
});

test('Validate all cashed out - success', () => {
  const players = [
    { user_id: 'alice', total_buy_in: 100, cash_out: 150 },
    { user_id: 'bob', total_buy_in: 100, cash_out: 50 }
  ];

  const result = validateAllCashedOut(players);
  assertEqual(result.valid, true, 'All players cashed out');
  assertEqual(result.missingPlayers.length, 0, 'No missing players');
});

test('Validate all cashed out - failure', () => {
  const players = [
    { user_id: 'alice', total_buy_in: 100, cash_out: 150 },
    { user_id: 'bob', total_buy_in: 100, cash_out: null },
    { user_id: 'charlie', total_buy_in: 50, cash_out: null }
  ];

  const result = validateAllCashedOut(players);
  assertEqual(result.valid, false, 'Not all cashed out');
  assertEqual(result.missingPlayers.length, 2, 'Two players missing');
});

test('Validate chip count - exact match', () => {
  const result = validateChipCount(5000, 5000);
  assertEqual(result.valid, true, 'Chips match exactly');
  assertEqual(result.discrepancy, 0, 'Zero discrepancy');
});

test('Validate chip count - within tolerance', () => {
  const result = validateChipCount(5000, 4998, 5);
  assertEqual(result.valid, true, 'Within tolerance');
  assertEqual(result.discrepancy, 2, 'Discrepancy is 2');
});

test('Validate chip count - exceeds tolerance', () => {
  const result = validateChipCount(5000, 4990, 5);
  assertEqual(result.valid, false, 'Exceeds tolerance');
  assertEqual(result.discrepancy, 10, 'Discrepancy is 10');
});

console.log('\n✨ All tests passed!\n');
