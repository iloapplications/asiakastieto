
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
  userid: process.env.USERID,
  passwd: process.env.PASSWD,
  shaKey: process.env.SHA_KEY
};

// do customer default check
const asiakastieto = new Asiakastieto(asiakastietoConfig);
const params = {
  enduser: 'ccccc',
  idnumber: process.env.ID_NUMBER,
  lang: 'EN',
  sequence: 25
};
const url = asiakastieto.buildDefaultCheckUrl(params);
const data = await asiakastieto.doRequestAndParseXML(url);

```


## More documentation

* [Asiakastieto](https://www.asiakastieto.fi/)
* [ILOapps.es](https://iloapps.es/)


## Support

THe package is provided 'AS IS'. Usage of this package is with your own care and responsibility. ILO APPLICATIONS SL does not provide any warranty or support for this package. The package is intended for our own projects and we use it in production/live environment. If we see any problems in our projects, we will update and fix accordingly.

For any bug report and improvement ideas, we are happy to receive them at support (at sign) iloapps.es.. :)

