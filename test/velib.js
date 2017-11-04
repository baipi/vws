const mochaPlugin = require('serverless-mocha-plugin');

const expect = mochaPlugin.chai.expect;
const wrapped = mochaPlugin.getWrapper('velib', '/src/velib/src/index.js', 'handler');

describe('velib', () => {
  it('Test Velib function', () =>
    wrapped.run({}).then((res) => {
      expect(res).to.not.be.empty;
      expect(res.headers).to.not.be.empty;
      expect(res.statusCode).to.not.be.empty;
      expect(res.body).to.not.be.empty;

      expect(res.headers).to.deep.equal({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      });
      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body)).to.be.a('array');
    }));
});
