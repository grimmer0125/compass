module.exports = function (app) {
  return async function clickVisible(selector) {
    // waitForDisplayed gives better errors than interacting with a non-existing
    // element
    const element = await app.client.$(selector);
    await element.click();
  };
};
