const { log, device, by, expect } = require('detox');

import { loadRecipientWallet } from './e2e-utils/loadRecipientWallet.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', async () => await loadRecipientWallet());
  it('shields transparent funds successfully', async () => {
    // Shield Assets
    await waitFor(element(by.id('header.shield')))
      .toExist()
      .withTimeout(50000);
    await element(by.id('header.shield')).tap();
    // // Confirm dialog
    await expect(element(by.text('CONFIRM'))).toBeVisible();
    await element(by.text('CONFIRM')).tap();
    // Wait for confirmation
    await waitFor(element(by.text(/Transmitted|In Mempool/gi)))
      .toExist()
      .withTimeout(50000);

    // Close and reopen to check that the transaction does not disappear
    await device.launchApp({
      newInstance: true,
    });

    // Transaction transmitted
    await waitFor(element(by.text(/In Mempool/gi)))
      .toExist()
      .withTimeout(50000);

    const tx = await element(by.text(/In Mempool/gi));

    console.log('tx', await tx.getAttributes());
  });
});
