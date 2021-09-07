const { delay } = require('../delay');

module.exports = function (app) {
  return async function waitForElement(
    selector,
    {
      timeout = 5000,
      interval = 50,
      mustExist = true,
      mustBeVisible = true,
      mustNotTransition = true,
      returnElement = false,
      existError,
      visibleError,
    } = {}
  ) {
    const getResult = async (exists) => {
      if (returnElement) {
        return exists ? app.client.$(selector) : null;
      }

      return exists ? true : false;
    };

    const existOpts = { timeout, interval, timeoutMsg: existError };
    try {
      await app.client.waitUntil(async () => {
        const element = await app.client.$(selector);
        return await element.isExisting();
      }, existOpts);
    } catch (err) {
      if (mustExist) {
        throw err;
      }
      return null;
    }

    if (!mustBeVisible) {
      return getResult(true);
    }

    const visibleOpts = { timeout, interval, timeoutMsg: visibleError };
    await app.client.waitUntil(async () => {
      const element = await app.client.$(selector);
      return await element.isDisplayed();
    }, visibleOpts);

    if (mustNotTransition) {
      // Ideally we could check if various properties of the element aren't
      // changing between two intervals, but this should be good enough for
      // now.
      await delay(100);
    }

    return getResult(true);
  };
};
