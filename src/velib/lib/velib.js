const axios = require('axios');
const utils = require('./utils');

// Settings
const TABLE = process.env.VELIB_TABLE;
const DETAILS_TABLE = process.env.VELIB_DETAILS_TABLE;
const G_DETAILS_TABLE = process.env.GOBEE_DETAILS_TABLE;
const JCD_KEY = process.env.JCDECAUX_KEY;
const JCD_CONTRACT = 'paris';
const JCD_URL = `https://api.jcdecaux.com/vls/v1/stations?contract=${JCD_CONTRACT}&apiKey=${JCD_KEY}`;
const GOBEE_URL = 'http://aws.gobee.bike/GobeeBike/bikes/near_bikes?';


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
   * Get all stations at a given date/hour
   *
   * @param  {string} Date format YYYY-MM-DD-HH
   * @return {any} Object containing stations
   */
  getAllStations(key) {
    const params = {
      TableName: DETAILS_TABLE,
      Key: {
        date: key,
      },
    };

    return this.db.get(params).promise()
      .then(data => data.Item);
  }

  /**
   * Update the daily row for general data
   *
   * {
   *   timestamp: <number>,
   *   open: <number>,
   *   total: <number>,
   *   nbStands: <number>,
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
      UpdateExpression: 'SET #o = :o, #t = :t, #n = :n, #ns = :ns, #ts = :ts',
      ExpressionAttributeNames: {
        '#o': 'open',
        '#t': 'total',
        '#n': 'nbBikes',
        '#ns': 'nbStands',
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
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
   * Update daily row by Velib stations
   *
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
   *    nbStands: <number>,
   *   }]
   * }
   * @param  {[type]}
   * @return {[type]}
   */
  updateDetailsRow(row) {
    const params = {
      TableName: DETAILS_TABLE,
      Key: { date: row.date },
      UpdateExpression: 'SET #s = :s, #ts = :ts',
      ExpressionAttributeNames: {
        '#s': 'stations',
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':s': row.stations,
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

        // Rows to insert
        const dayRow = {
          date: utils.UTCdateKey(), // Date UTC
          open: 0, // Number of opened stations
          total: 0, // according to http://www.parisavelo.net/stats.php
          nbBikes: 0,
          nbStands: 0,
        };

        const detailsRow = {
          date: utils.UTCdateKey(), // Date UTC
          stations: [], // Stations list
        };

        // For each station from JCDECEAUX API
        for (let i = 0; i < allStations.length; i += 1) {
          const s = allStations[i];
          dayRow.total += 1;

          const station = { // station attributes
            pos: s.position,
          };

          if (s.status === 'CLOSED') { // Is station closed or opened
            station.isClosed = true;
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

          detailsRow.stations.push(station);
        }

        // Update or create if not exist
        return Promise.all([this.updateRow(dayRow), this.updateDetailsRow(detailsRow)])
          .then((res) => {
            const day = res[0];
            day.stations = res[1].stations;

            return day;
          });
      });
  }


  /**
   * Update hourly row for Gobee bikes
   *
   * {
   *    bikes: [{
   *      id: <string>,
   *      pos: {
   *        lat: <number>,
   *        lng: <number>,
   *      },
   *      type: <string>,
   *    }, ...],
   *    city: <string>,
   *    date: <string>,
   *    timestamp: <number>,
   * }
   *
   * @param  {any} Row to insert/update
   * @return {any} Inseretd row
   */
  updateGobeeDetailsRow(row) {
    const params = {
      TableName: G_DETAILS_TABLE,
      Key: { date: row.date },
      UpdateExpression: 'SET #b = :b, #ts = :ts, #c = :c',
      ExpressionAttributeNames: {
        '#b': 'bikes',
        '#c': 'city',
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':b': row.bikes,
        ':c': row.city,
        ':ts': Date.now(),
      },
      ReturnValues: 'ALL_NEW',
    };

    return this.db.update(params).promise()
      .then(data => data.Attributes);
  }


  /**
   * Get Gobee bikes in Paris
   *
   * {
   *    bikes: [{
   *      id: <string>,
   *      pos: {
   *        lat: <number>,
   *        lng: <number>,
   *      },
   *      type: <string>,
   *    }, ...],
   *    city: <string>,
   *    date: <string>,
   *    timestamp: <number>,
   * }
   *
   * @return {Any} A Gobee bikes array
   */
  gobeeParis() {
    const bbox = [[48.80, 2.24], [48.90, 2.43]]; // Paris bounding box
    const step = 0.01; // Mooving 0.01 decimal degree each request

    const urls = []; // Urls to execute
    const bikes = {}; // Bikes list. Bike ID is used as a key to avoid double value

    // Generate requests for Paris area
    for (let lat = bbox[0][0]; lat < bbox[1][0]; lat += step) {
      for (let lng = bbox[0][1]; lng < bbox[1][1]; lng += step) {
        urls.push(axios.get(GOBEE_URL.concat(`lat=${lat}&lng=${lng}`))
          .catch(() => { // Workaround to avoid axios.all failing in case of loading error on 1 url
            console.log('ERROR: '.concat(GOBEE_URL, `lat=${lat}&lng=${lng}`));
            return Promise.resolve();
          }));
      }
    }

    // Execute all requests for Paris area
    return axios.all(urls)
      .then((res) => {
        for (let i = 0; i < res.length; i += 1) {
          // Ensure the request have data (no error)
          if (res[i] && res[i].data && res[i].data.data && res[i].data.data.bikes) {
            const request = res[i].data.data.bikes; // Get bikes

            for (let b = 0; b < request.length; b += 1) {
              const bike = request[b];

              bikes[bike.bid] = { // Format data
                id: bike.bid,
                type: 'gobee',
                pos: {
                  lat: Math.floor(bike.gLat * 1000) / 1000, // Round to reduce JSON size
                  lng: Math.floor(bike.gLng * 1000) / 1000,
                },
              };
            }
          }
        }

        const row = {
          bikes: Object.keys(bikes).map(k => bikes[k]),
          date: utils.UTCdateKey(), // Date UTC
          city: 'paris',
        };

        return (this.updateGobeeDetailsRow(row));
      });
  }
}

module.exports = Velib;
