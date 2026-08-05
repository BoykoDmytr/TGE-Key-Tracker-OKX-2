// REGRESSION HARNESS (bot2 chains) — every real historical deposit must still yield 1 message.
delete process.env.REDIS_URL;
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
process.env.THRESHOLDS_JSON = '{}';
process.env.FACTORIES_DEFAULT =
  '0x000310fa98E36191ec79de241d72C6CA093EAFd3,0x00306cEfc385c8767cA580913a3F88319a343FC0';

const { processDepositTx } = await import('./dist/handlers.js');
const { getPollerClient } = await import('./dist/poller/clients.js');

const CASES = [
  ['ethereum', '0xbdf47de7eb25b8e1d0c5d5f3d9a97722b5405442dd78d99239f986911fa54110', '0xfd022efbefafb46cb1209c4c2b4cb22cfce152ec', '20,000,000', 'CAP'],
  ['ethereum', '0xed9aaa5b7445161f73c143dfa8fb37fb3cae2824f946c1b2e0757d55251ae530', '0xf5746080656347087d8a1607284d1b52f7dc390a', '2,000,000', 'RE'],
  ['ethereum', '0x6571f71fbaacc967f7b7da2c8324eae15fc55707365bb95926bea6317c65014d', '0x11aacf3d33a7d8a700d2114d353d897512023c0a', '500,000', 'USDT 6dec'],
  ['avalanche', '0x9cad099a5fb7e612a9f68927ee71372912e8ab767818407be419059d9bac3b81', '0xdf7e0d46caba1dbcef23f90e703a82ceba231426', '5,000,000', 'YOM'],
];

let pass = 0, fail = 0;
for (const [chain, tx, wantDist, wantAmt, note] of CASES) {
  let count = 0; const seen = [];
  const log = {
    info: (obj, msg) => {
      if (typeof msg === 'string' && msg.includes('would send deposit')) {
        count++; seen.push({ to: obj.to, amountLine: obj.amountLine });
      }
    },
  };
  try {
    await processDepositTx(chain, tx, getPollerClient(chain), {
      notify: false, persist: false, source: 'poller', blockTimestamp: 0, log,
    });
  } catch (e) {
    console.log(`FAIL  ${chain.padEnd(10)} ${note.padEnd(12)} threw: ${e.message}`); fail++; continue;
  }
  const ok = count === 1 && seen[0]?.to?.toLowerCase() === wantDist.toLowerCase() && seen[0]?.amountLine?.includes(wantAmt);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${chain.padEnd(10)} ${note.padEnd(12)} count=${count} ${seen[0]?.amountLine || ''} -> ${seen[0]?.to || ''}`);
  ok ? pass++ : fail++;
}
console.log(`\n=========== ${pass} passed, ${fail} failed ===========`);
process.exit(fail ? 1 : 0);
