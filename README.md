
# asiakastieto

Nodejs **Asiakastieto integration** for our projects.

This library is developed for our internal purposes, but you may find it useful if you work with Asiakastieto in similar environment too.

## Installation

  **Requirements:** Suomen Asiakastieto agreement and credentials, NodeJS.

  ```bash
  npm install asiakastieto --save
  ```

  or using Yarn:

  ```bash
  yarn add asiakastieto
  ```

## Usage

```javascript

const Asiakastieto = require('asiakastieto');

const asiakastietoConfig = {
  client_id: 'YOUR SIGNICAT CLIENT ID',
  secret: 'YOUR SIGNICAT SECRET',
  isProd: process.env.NODE_ENV === 'production',
  requestPromise: require('request-promise'),
  privateJwk: 'YOUR SIGNICAT PRIVATE JWK',
  FTN: true
};

// get authorization url
const signicatParams = {
  redirect_uri: signicatReturnUrl, // Redirection URI to which the response will be sent.
  state: state, // Required. Opaque value used to maintain state between the request and the callback.
  response_type: 'code', // Required. When using the Authorization Code Flow, this value is “code”.
  scope: 'openid profile signicat.national_id ftn', // Required. The OpenID scope value specifies the behavior.
  nonce: nonce, // Optional. String value used to associate a Client session with an ID Token,
  ui_locales: 'en', // fi, sv
  acr_values: 'urn:signicat:oidc:portal:ftn-auth' // Optional. Requested Authentication Context Class Reference values
};
const authorizationUrl = await new Signicat(signicatConfig).getAuthorizationUrl(signicatParams);


// get access token
const signicatParams = {
  code: code,
  grant_type: 'authorization_code',
  redirect_uri: redirect_uri
};
const accessToken = await new Signicat(signicatConfig).postAccessToken(signicatParams);

// get user info
const signicatParams = { access_token };

const userInfo = await new Signicat(signicatConfig).getUserInfo(signicatParams);
const ssn = userInfo['signicat.national_id'] || userInfo['ssn'];
const firstName = userInfo['ftn.firstNames'] || userInfo['given_name'] || userInfo['ftn.firstBirthName'];
const familyName = userInfo['ftn.familyBirthName'] || userInfo['family_name'];
const fullName = userInfo['name'];
const dob = userInfo['birthdate'];
```


## More documentation

* [Signicat Developer Portal](https://developer.signicat.com/)
* [ILOapps.es](https://iloapps.es/)


## Support

THe package is provided 'AS IS'. Usage of this package is with your own care and responsibility. ILO APPLICATIONS SL does not provide any warranty or support for this package. The package is intended for our own projects and we use it in production/live environment. If we see any problems in our projects, we will update and fix accordingly.

For any bug report and improvement ideas, we are happy to receive them at support (at sign) iloapps.es.. :)

