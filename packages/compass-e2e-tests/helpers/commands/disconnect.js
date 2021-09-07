const { delay } = require('../delay');
const Selectors = require('../selectors');

async function closeConnectionModal(app) {
  await app.client.clickVisible(Selectors.CancelConnectionButton);
  await app.client.waitUntilGone(Selectors.ConnectionStatusModalContent, {
    timeoutMsg:
      'Expected connection status modal to disappear after cancelling the connection',
  });
}

module.exports = function (app) {
  return async function () {
    const cancelConnectionButtonElement = await app.client.$(
      Selectors.CancelConnectionButton
    );
    // If we are still connecting, let's try cancelling the connection first
    if (await cancelConnectionButtonElement.isDisplayed()) {
      try {
        await closeConnectionModal(app);
      } catch (e) {
        // If that failed, the button was probably gone before we managed to
        // click it. Let's go through the whole disconnecting flow now
      }
    }

    app.webContents.send('app:disconnect');

    await app.client.waitUntil(
      async () => {
        const element = await app.client.$(Selectors.ConnectSection);
        return await element.isDisplayed();
      },
      {
        timeout: 5000,
        timeoutMsg: 'Expected connection screen to be visible',
        interval: 50,
      }
    );

    // Show "new connection" section as if we just opened this screen
    await app.client.clickVisible(Selectors.SidebarNewConnectionButton);
    await delay(100);
  };
};
