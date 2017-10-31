const axios = require('axios');
const utils = require('./utils');

// Settings
const TABLE = process.env.VELIB_TABLE;
const JCD_KEY = process.env.JCDECAUX_KEY;
const JCD_CONTRACT = 'paris';
const JCD_URL = `https://api.jcdecaux.com/vls/v1/stations?contract=${JCD_CONTRACT}&apiKey=${JCD_KEY}`;


class Velib {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all rows on the table.
   * As DynamoDB scan return only 1MB of data, we have to iterate.
   *
   * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#scan-property
   *
   * @return {any[]} An array with all rows
   */
  getAllRows() {
    let items = [];
    let lastEvaluatedKey;

    // Stopping condition
    const scanCondition = () => (typeof lastEvaluatedKey !== 'undefined');

    // Scan request
    const scanTable = () => {
      const params = {
        TableName: TABLE,
        AttributesToGet: ['open', 'total', 'nbBikes', 'nbStands', 'date', 'timestamp'],
      };

      if (typeof lastEvaluatedKey !== 'undefined') {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      return this.db.scan(params).promise()
        .then((data) => {
          lastEvaluatedKey = data.LastEvaluatedKey;
          items = items.concat(data.Items);
          return Promise.resolve(data.LastEvaluatedKey);
        });
    };

    // Tant que la table contient des valeurs
    return utils.promiseWhile(scanCondition, scanTable, true)
      .then(() => items);
  }

  /**
   * Update the daily row
   * {
   *   timestamp: <number>,
   *   stations: [{
   *    id: <string>,
   *    pos: {
   *      lat: <number>,
   *      lng: <number>,
   *    }
   *    isOpen: <boolean>,
   *    nbBikes: <number>,
   *   }],
   *   open: <number>,
   *   total: <number>,
   *   nbBikes: <number>,
   * }
   * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#update-property
   *
   * @param  {any} Data to update/insert
   * @return {any} Full updated row
   */
  updateRow(row) {
    const params = {
      TableName: TABLE,
      Key: { date: row.date },
      UpdateExpression: 'SET #s = :s, #o = :o, #t = :t, #n = :n, #ns = :ns, #ts = :ts',
      ExpressionAttributeNames: {
        '#s': 'stations',
        '#o': 'open',
        '#t': 'total',
        '#n': 'nbBikes',
        '#ns': 'nbStands',
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':s': row.stations,
        ':o': row.open,
        ':t': row.total,
        ':n': row.nbBikes,
        ':ns': row.nbStands,
        ':ts': Date.now(),
      },
      ReturnValues: 'ALL_NEW',
    };

    return this.db.update(params).promise()
      .then(data => data.Attributes);
  }

  /**
   * For the current day, get stations state and compute them before insert
   *
   * @see https://developer.jcdecaux.com/#/opendata/vls?page=dynamic
   * @see http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
   *
   * @return {[type]}
   */
  computeDay() {
    return axios.get(JCD_URL)
      .then(res => res.data)
      .then((allStations) => {
        if (typeof allStations === 'undefined') {
          return Promise.reject(new Error('JCDecaux API doesn\'t work'));
        }

        // Row to inser
        const dayRow = {
          date: utils.UTCdateKey(), // Date UTC
          stations: [], // Stations list
          open: 0, // Number of opened stations
          total: 0,
          nbBikes: 0,
          nbStands: 0,
        };

        // For each station from JCDECEAUX API
        for (let i = 0; i < allStations.length; i += 1) {
          const s = allStations[i];
          dayRow.total += 1;

          const station = { // station attributes
            pos: s.position,
          };

          if (s.status === 'CLOSED') { // Is station closed or opened
            station.isClose = true;
          } else {
            // Data on station
            station.isClosed = false;
            station.nbBikes = s.available_bikes;
            station.nbStands = s.available_bike_stands;

            // Data on all stations
            dayRow.open += 1;
            dayRow.nbBikes += s.available_bikes;
            dayRow.nbStands += s.available_bike_stands;
          }

          dayRow.stations.push(station);
        }

        // Update or create if not exist
        return this.updateRow(dayRow);
      });
  }
}

module.exports = Velib;
