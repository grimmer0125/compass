const { delay } = require('../delay');
const Selectors = require('../selectors');

module.exports = function (app) {
  return async function (str, parse = false, timeout = 10000) {
    const shellContentElement = await app.client.$(Selectors.ShellContent);
    if (!(await shellContentElement.isDisplayed())) {
      await app.client.clickVisible(Selectors.ShellExpandButton);
    }
    await app.client.clickVisible(Selectors.ShellInput);
    // Might be marked with a deprecation warning, but can be used
    // https://github.com/webdriverio/webdriverio/issues/2076
    await app.client.keys(parse === true ? `JSON.stringify(${str})` : str);
    await app.client.keys('\uE007');

    await app.client.waitUntilGone(Selectors.ShellLoader, {
      timeout,
      timeoutMsg: `Expected shell evaluation to finish in ${timeout}ms`,
      interval: 50,
    });

    await delay(50);
    const shellOutputElements = await app.client.$$(Selectors.ShellOutput);
    const output = await shellOutputElements[
      shellOutputElements.length - 1
    ].getText();
    let result = Array.isArray(output) ? output.pop() : output;
    if (parse === true) {
      result = JSON.parse(result.replace(/(^['"]|['"]$)/g, ''));
    }
    return result;
  };
};
