# Velib' Web Services (VWS) - API

This Serverless project is about creating an API to get Velib' and Gobee (Paris sharing bike service) history.

JC Decaux Velib' will disappear by the middle of 2018 and replace by Smoveongo Velib'. Thanks to this API, we will be able to see the decrease in the number of available bikes and stations.
Lambda function executed every hour and at call, will get and compute Velib' data from JC Decaux API and record them on a database.

This app deploys a Lambda function, a DynamoDB table and an API Gateway route as to access data.

## Requirements
* [An AWS account](http://docs.aws.amazon.com/AmazonSimpleDB/latest/DeveloperGuide/AboutAWSAccounts.html)
* An AWS authentication key [created](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html) and [stored](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)
* [A JC Decaux developper account](https://developer.jcdecaux.com/#/login)


## Installation
At first, you have to download or clone this repository.

Then, go in repository and run:
```
$  npm install
````

Configure parameters in `serverless.yml` and `config/secret.yml` (profile and API key):
```yaml
provider:
  # profile: <PROFILE_NAME> # Uncomment if you want to use a specific profile    
```

```
JCDECAUX_KEY: <YOUR_API_KEY>
```

## Deployment
Deploy full Serverless on your AWS account (first time):
```
$  sls deploy --verbose
```

Deploy only `velib` function:
```
$  sls deploy function --function velib
```

## Run locally
Thanks to Serverless offline packages, the Velib' Web Services (VWS) can be  locally tested, then deployed on your AWS account.
Used packages are [`serverless-offline`](https://www.npmjs.com/package/serverless-offline) and [`serverless-dynamodb-local`](https://www.npmjs.com/package/serverless-dynamodb-local).

Initialize local DynamoDB (only one time):
```
$  sls dynamodb install
```

Start offline Serverless. A local API server will be generated containing  available routes (such as `http://localhost:3000/<route_name>`).
```
$  sls offline start
```

## Test
Export your API Key:
```
export JCDECAUX_KEY=<YOUR_API_KEY>
```

Run online test:
```
npm run test
```

Or offline test:
```
sls offline start
npm run test-offline
```


## Contribute
Don't hesitate to contribute, all pull requests are welcome.

Just make sure you run linter and tests before making your PR.

```
npm run lint
npm run lint-test
npm run test
```

## TO DO
* Increase tests
* Gobee and Velib could be split in several files/folders
* Support more cities

## Related
* [VWS article]() (french)
* [Serverless official website](https://serverless.com)