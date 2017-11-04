/* eslint no-unused-expressions: "off" */
/* eslint prefer-destructuring: "off" */

const chai = require('chai');

const expect = chai.expect;

const AWS = require('aws-sdk');
const AWSMock = require('aws-sdk-mock');

const utils = require('../lib/utils');
const Velib = require('../lib/velib');


describe('Utils', () => {
  it('should run while promise', (done) => {
    let cpt = 2;

    const condition = () => (cpt > 0);

    const action = () => {
      cpt -= 1;
      return Promise.resolve(cpt);
    };

    utils.promiseWhile(condition, action, false)
      .then(() => {
        expect(cpt).to.equal(0);
        done();
      })
      .catch(done);
  });

  it('should run do...while promise', (done) => {
    let cpt = 0;

    const condition = () => (cpt > 0);

    const action = () => {
      cpt -= 1;
      return Promise.resolve(cpt);
    };

    utils.promiseWhile(condition, action, true)
      .then(() => {
        expect(cpt).to.equal(-1);
        done();
      })
      .catch(done);
  });

  it('should get YYYY-MM-DD-HH string', () => {
    const d = utils.UTCdateKey();
    const split = d.split('-');

    expect(d).to.be.a('string');
    expect(split.length).to.equal(4);
  });
});

describe('Velib', () => {
  const allRowData = [
    {
      total: 917, nbBikes: 12204, open: 896, nbStands: 16692, date: '2017-10-27-10', timestamp: 1509100108547,
    },
    {
      total: 917, nbBikes: 12371, open: 896, nbStands: 16547, date: '2017-10-27-9', timestamp: 1509098231319,
    },
    {
      total: 917, nbBikes: 12184, open: 896, nbStands: 16745, date: '2017-10-27-11', timestamp: 1509105327152,
    },
  ];

  const oneRowData = {
    total: 917,
    nbBikes: 12204,
    open: 896,
    nbStands: 16692,
    date: '2017-10-27-10',
  };

  const oneRowDetailsData = {
    stations: [],
    date: '2017-10-27-10',
  };

  beforeEach(() => {
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, { Items: allRowData });
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
      let item;
      if (typeof params.ExpressionAttributeNames['#s'] === 'undefined') {
        item = oneRowData;
      } else {
        item = oneRowDetailsData;
      }

      item.timestamp = 1509100108547;

      callback(null, { Attributes: item });
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
      const item = oneRowDetailsData;

      item.timestamp = 1509100108547;

      callback(null, { Item: item });
    });
  });

  afterEach(() => {
    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('should get all rows', (done) => {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const velib = new Velib(documentClient);

    velib.getAllRows()
      .then((res) => {
        expect(res).to.not.be.empty;
        expect(res).to.be.a('array');
        expect(res).to.deep.equal(allRowData);
        done();
      })
      .catch(done);
  });

  it('should get all rows with ExclusiveStartKey', (done) => {
    // Ovveride default
    AWSMock.restore('DynamoDB.DocumentClient');
    let cpt = 1;
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      const data = { Items: allRowData };
      if (cpt === 1) {
        data.LastEvaluatedKey = { date: '2017-10-29-8' };
      }
      cpt -= 1;
      callback(null, data);
    });


    const documentClient = new AWS.DynamoDB.DocumentClient();
    const velib = new Velib(documentClient);

    velib.getAllRows()
      .then((res) => {
        expect(res).to.not.be.empty;
        expect(res).to.be.a('array');
        expect(res.length).to.deep.equal(allRowData.length * 2);
        done();
      })
      .catch(done);
  });

  it('should get all stations', (done) => {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const velib = new Velib(documentClient);

    velib.getAllStations('2017-10-27-10')
      .then((res) => {
        expect(res).to.not.be.empty;
        expect(res.stations).to.be.a('array');
        expect(res.stations).to.deep.equal(oneRowDetailsData.stations);
        done();
      })
      .catch(done);
  });

  it('should updateRow row', (done) => {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const velib = new Velib(documentClient);

    velib.updateRow(oneRowData)
      .then((res) => {
        expect(res).to.not.be.empty;
        expect(res).to.be.an('object');
        expect(res.timestamp).to.exist;
        done();
      })
      .catch(done);
  });

  it('should updateDetailsRow row', (done) => {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const velib = new Velib(documentClient);

    velib.updateDetailsRow(oneRowDetailsData)
      .then((res) => {
        expect(res).to.not.be.empty;
        expect(res).to.be.an('object');
        expect(res.timestamp).to.exist;
        done();
      })
      .catch(done);
  });

  it('should compute day', (done) => {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const velib = new Velib(documentClient);

    velib.computeDay()
      .then((res) => {
        expect(res).to.not.be.empty;
        expect(res).to.be.an('object');
        expect(res.timestamp).to.exist;
        done();
      })
      .catch(done);
  });
});
