module.exports = function (app) {
  return async function waitUntilGone(
    selector,
    { timeout = 5000, interval = 50, timeoutMsg } = {}
  ) {
    return app.client.waitUntil(
      async () => {
        const element = await app.client.$(selector);
        return !(await element.isExisting());
      },
      {
        timeout,
        interval,
        timeoutMsg,
      }
    );
  };
};
