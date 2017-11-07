const AWS = require('aws-sdk');
const Velib = require('../lib/velib');

// Check if Serverless run locally
if (process.env.IS_OFFLINE) {
  AWS.config.dynamodb = {
    region: 'localhost',
    endpoint: `http://localhost:${process.env.LOCAL_DYNAMODB_PORT || 8000}`,
  };

  AWS.config.dynamodb.documentClient = {
    region: 'localhost',
    endpoint: `http://localhost:${process.env.LOCAL_DYNAMODB_PORT || 8000}`,
  };
}

exports.handler = (event, context, callback) => {
  try {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const velib = new Velib(documentClient);

    return velib.gobeeParis() // Get and compute data for given day
      .then((data) => { // Return result
        const response = {
          headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
          },
          statusCode: 200,
          body: JSON.stringify(data),
        };

        return callback(null, response);
      })
      .catch((err) => {
        console.log(err);
        const response = {
          headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
          },
          statusCode: 403,
          body: JSON.stringify({ message: 'Access forbidden' }),
        };
        return callback(response);
      });
  } catch (err) {
    console.log(err);
    const response = {
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
      },
      statusCode: 403,
      body: JSON.stringify({ message: 'Access forbidden' }),
    };
    return callback(response);
  }
};
