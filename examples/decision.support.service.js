const Asiakastieto = require('../index'); // require('asiakastieto')
const assert = require('assert');

assert.ok(process.env.USERID, 'Please specify a USERID env var');
assert.ok(process.env.PASSWD, 'Please specify a PASSWD env var');
assert.ok(process.env.SHA_KEY, 'Please specify a SHA_KEY env var');

const config = {
  userid: process.env.USERID,
  passwd: process.env.PASSWD,
  shaKey: process.env.SHA_KEY
};

run().catch(error => {
  console.error(error.stack);
  process.exit(0);
});

async function run() {
  const asiakastieto = new Asiakastieto(config);
  const params = {
    enduser: 'ccccc',
    idnumber: '020196-6638',  // Only for testing (MHL1)
    lang: 'EN',
    sequence: 26,
    //model: 'MALLI1',
    //creditAmount: 1000,
    //customerKey: 1234
  };
  const url = asiakastieto.buildDecisionSupportServiceUrl(params);
  console.log(url);
  const data = await asiakastieto.doRequestAndParseXML(url);

  console.log(JSON.stringify(data, null, 2));

  process.exit(0);
}