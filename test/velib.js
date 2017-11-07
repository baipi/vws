const mochaPlugin = require('serverless-mocha-plugin');

const expect = mochaPlugin.chai.expect;
const velibGet = mochaPlugin.getWrapper('velib', '/src/velib/src/index.js', 'handler');
const stationsGet = mochaPlugin.getWrapper('velib', '/src/velib/src/stations.js', 'handler');
const gobeeParisGet = mochaPlugin.getWrapper('velib', '/src/velib/src/gobeeParis.js', 'handler');

describe('VWS', () => {
  it('Test GET Velib function', () =>
    velibGet.run({}).then((res) => {
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

  it('Test GET Velib stations function', () =>
    stationsGet.run({}).then((res) => {
      expect(res).to.not.be.empty;
      expect(res.headers).to.not.be.empty;
      expect(res.statusCode).to.not.be.empty;
      expect(res.body).to.not.be.empty;

      expect(res.headers).to.deep.equal({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      });
      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body).stations).to.be.a('array');
    }));

  it('Test GET Paris Gobee bikes function', () =>
    gobeeParisGet.run({}).then((res) => {
      expect(res).to.not.be.empty;
      expect(res.headers).to.not.be.empty;
      expect(res.statusCode).to.not.be.empty;
      expect(res.body).to.not.be.empty;

      expect(res.headers).to.deep.equal({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      });
      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body).bikes).to.be.a('array');
    }));
});
