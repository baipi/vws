/**
 * Allow to execute promises synchronously with a condition, like a while
 *
 * @see http://stackoverflow.com/a/24660323/3263033
 *
 * @param  {function} Returns a condition that will be false when we need to stop iterating
 * @param  {function} Returns a promise to execute on each iteration
 * @param  {boolean}  If true, execute function at least one time (as a do...while)
 * @return {Promise}  The promise to execute to start the while
 */
const promiseWhile = (condition, action, doWhile) => {
  if (!doWhile && !condition()) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(action)
    .then(promiseWhile.bind(null, condition, action, false));
};

/**
 * Generate day KEY, format: YYYY-MM-DD-HH, UTC
 *
 * @return {string} Day key
 */
const UTCdateKey = () => {
  const d = new Date();
  return d.getUTCFullYear().toString()
    .concat('-', d.getUTCMonth() + 1, '-', d.getUTCDate(), '-', d.getHours());
};

module.exports.UTCdateKey = UTCdateKey;
module.exports.promiseWhile = promiseWhile;
