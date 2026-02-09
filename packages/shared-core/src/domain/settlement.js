/**
 * Settlement Calculator - Debt Minimization Algorithm
 *
 * Pure function that calculates optimal payment transactions
 * to settle debts between players with minimum transfers.
 *
 * @param {Array<{user_id: string, net_result: number}>} players - Players with net profit/loss
 * @returns {Array<{from_user_id: string, to_user_id: string, amount: number}>}
 */
export function computeSettlement(players) {
  if (!players || players.length === 0) {
    return [];
  }

  // Separate winners (positive net) and losers (negative net)
  const winners = players
    .filter(p => (p.net_result || 0) > 0)
    .map(p => ({
      user_id: p.user_id,
      credit: p.net_result
    }))
    .sort((a, b) => b.credit - a.credit); // Descending

  const losers = players
    .filter(p => (p.net_result || 0) < 0)
    .map(p => ({
      user_id: p.user_id,
      debt: Math.abs(p.net_result)
    }))
    .sort((a, b) => b.debt - a.debt); // Descending

  const settlements = [];
  let i = 0; // losers index
  let j = 0; // winners index

  // Greedy matching: match largest debts with largest credits
  while (i < losers.length && j < winners.length) {
    const loser = losers[i];
    const winner = winners[j];

    // Amount to transfer is minimum of debt and credit
    const amount = Math.min(loser.debt, winner.credit);

    if (amount > 0.01) { // Ignore tiny amounts
      settlements.push({
        from_user_id: loser.user_id,
        to_user_id: winner.user_id,
        amount: Math.round(amount * 100) / 100 // Round to 2 decimals
      });
    }

    // Update remaining debt/credit
    loser.debt -= amount;
    winner.credit -= amount;

    // Move to next loser/winner if fully settled
    if (loser.debt <= 0.01) i++;
    if (winner.credit <= 0.01) j++;
  }

  return settlements;
}

/**
 * Validate that all players have cashed out
 *
 * @param {Array<{user_id: string, cash_out: number|null, total_buy_in: number}>} players
 * @returns {{valid: boolean, missingPlayers: Array<string>}}
 */
export function validateAllCashedOut(players) {
  const missingPlayers = players
    .filter(p => p.total_buy_in > 0 && (p.cash_out === null || p.cash_out === undefined))
    .map(p => p.user_id);

  return {
    valid: missingPlayers.length === 0,
    missingPlayers
  };
}

/**
 * Validate chip count integrity
 *
 * @param {number} totalDistributed - Total chips given out
 * @param {number} totalReturned - Total chips returned
 * @param {number} tolerance - Acceptable discrepancy (default 0)
 * @returns {{valid: boolean, discrepancy: number}}
 */
export function validateChipCount(totalDistributed, totalReturned, tolerance = 0) {
  const discrepancy = Math.abs(totalDistributed - totalReturned);
  return {
    valid: discrepancy <= tolerance,
    discrepancy
  };
}
