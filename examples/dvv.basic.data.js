const Asiakastieto = require('../index'); // require('asiakastieto')
const assert = require('assert');

assert.ok(process.env.USERID, 'Please specify a USERID env var');
assert.ok(process.env.PASSWD, 'Please specify a PASSWD env var');
assert.ok(process.env.SHA_KEY, 'Please specify a SHA_KEY env var');

const config = {
  userid: process.env.USERID,
  passwd: process.env.PASSWD,
  shaKey: process.env.SHA_KEY,
  requestPromise: require('request-promise')
};

run().catch(error => {
  console.error(error.stack);
  process.exit(0);
});

async function run () {
  const asiakastieto = new Asiakastieto(config);
  const params = {
    enduser: 'testtesttest',
    idnumber: '010100-123D',
    lang: 'EN',
    sequence: 27
  };
  const url = asiakastieto.buildDvvBasicDataUrl(params);
  console.log(url);
  const data = await asiakastieto.doRequestAndParseXML(url);

  console.log(JSON.stringify(data, null, 2));

  process.exit(0);
}
