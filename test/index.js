'use strict';

const should = require('should');
const chai = require('chai');
const validator = require('validator');
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const MockDate = require('mockdate');
const fs = require('fs');
chai.use(sinonChai);
chai.use(chaiAsPromised);
const Asiakastieto = require('../index');
const urlOptions = {
  protocols: ['https'],
  require_valid_protocol: true,
  require_protocol: true,
  require_tld: false // for localhost
};

const apiUrl = 'https://demo.asiakastieto.fi/services/consumer5/REST';
const stringRange = (start, end, zeros) => Array.from(Array(end - start + 1), (_, i) => {
  return (start + i).toString().padStart(zeros, '0');
});
const checksumDemo = '71BCA0FDF4926E784A1C86B64E528435305B5FFD0952C6B1834F234D44CAC69674E0D7A95A484F1708D82DC623F24D3F331732619E5ED7E3237DA139A8D00643';
const authenticationFailureXml = fs.readFileSync('./test/xml/authentication_failure.xml');
const versionFailureXml = fs.readFileSync('./test/xml/version_not_supported.xml');
const genericErrorXml = fs.readFileSync('./test/xml/generic_error.xml');
const defaultCheckResponseXml = fs.readFileSync('./test/xml/default_check_response.xml');

let config, basicParams;
beforeEach(() => {
  MockDate.reset();
  config = {
    userid: 'testusername',
    passwd: 'pwd123',
    shaKey: 'ABXEYYUEOVJCMEUEWUJDJ',
    isProd: false,
    requestPromise: function () {}
  };
  basicParams = {
    enduser: 'cccccc',
    idnumber: '23423423423',
    sequence: (Math.floor(Math.random() * (99999 - 1 + 1)) + 1),
    lang: 'FI',
    ccenter: '123456789'
  };
});

/*  YYYYMMDDHHMMSSXXTZNNNNNN where
      YYYY = year in four digits
      MM = month 01 - 12
      DD = day of the month 01 - 31
      HH = hour 00 - 23
      MM = minutes 00 - 59
      SS = seconds 00 - 59
      XX = hundredths of a second 00 - 99
      TZN = time zone correction in relation to GMT.
      In Finland“ % 2 B02”(plus has to be included as UTF - 8 hexadecimal value % 2 B).The offset from
      GMT is always presented in relation to local
      normal time, daylight saving time(DST) is not
      added to the correction value.
      NNNNN = consecutive number
    */
function validateTimestamp (timestamp, sequence) {
  expect(stringRange(2010, 2100)).to.include(timestamp.substr(0, 4));
  expect(stringRange(1, 12, 2)).to.include(timestamp.substr(4, 2));
  expect(stringRange(1, 31, 2)).to.include(timestamp.substr(6, 2));
  expect(stringRange(0, 23, 2)).to.include(timestamp.substr(8, 2));
  expect(stringRange(0, 59, 2)).to.include(timestamp.substr(10, 2));
  expect(stringRange(0, 59, 2)).to.include(timestamp.substr(12, 2));
  expect(stringRange(0, 999, 3)).to.include(timestamp.substr(14, 3));

  expect(timestamp.substr(-5)).to.equal(sequence.toString().padStart(5, '0'));
}

function validateBasicUrlParams (urlObject, config, params) {
  expect(urlObject.protocol + '//' + urlObject.host + urlObject.pathname).to.equal(apiUrl);
  expect(urlObject.searchParams.get('passwd')).to.equal(config.passwd);
  expect(urlObject.searchParams.get('userid')).to.equal(config.userid);
  expect(urlObject.searchParams.get('version')).to.equal('2018');
  expect(urlObject.searchParams.get('format')).to.equal('xml');
  expect(urlObject.searchParams.get('enduser')).to.equal(params.enduser);
  expect(urlObject.searchParams.get('idnumber')).to.equal(params.idnumber);
  expect(urlObject.searchParams.get('lang')).to.equal(params.lang);
  validateTimestamp(urlObject.searchParams.get('timestamp'), params.sequence);
  expect(urlObject.searchParams.get('checksum').length).to.equal(checksumDemo.length);
  expect(urlObject.searchParams.get('ccenter')).to.equal(params.ccenter);
}

describe('Asiakastieto', function () {
  describe('Constructor', () => {
    it('Should return an error if requestPromise not configured', () => {
      delete config.requestPromise;
      expect(() => new Asiakastieto(config)).to.throw(Error, /requestPromise/);
    });
    it('Should return an error when userid is missing', () => {
      delete config.userid;
      expect(() => new Asiakastieto(config)).to.throw(Error, /userid/);
    });
    it('Should return an error when userid is not 12 chars', () => {
      config.userid = 'testuserid';
      expect(() => new Asiakastieto(config)).to.throw(Error, /length must be 12 chars/);
    });
    it('Should return an error when passwd is missing', () => {
      delete config.passwd;
      expect(() => new Asiakastieto(config)).to.throw(Error, /passwd/);
    });
    it('Should return an error when passwd length is not valid', () => {
      config.passwd = 'password1234';
      expect(() => new Asiakastieto(config)).to.throw(Error, /passwd is too large/);
    });
    it('Should return an error when shaKey is missing', () => {
      delete config.shaKey;
      expect(() => new Asiakastieto(config)).to.throw(Error, /shaKey/);
    });
    it('Should return an error when isProd is not a valid boolean', () => {
      config.isProd = 'true';
      expect(() => new Asiakastieto(config)).to.throw(Error, /isProd/);
    });
  });

  describe('Build timestamp', () => {
    it('Should return a formatted timestamp that matches required format(+2 GMT): YYYYMMDDHHMMSSXXTZNNNNNN', () => {
      MockDate.set(new Date(), +120);
      // i.e: 2008021514330000%2B0200001
      const consecutiveNumber = (Math.floor(Math.random() * (99999 - 1 + 1)) + 1);
      const timestamp = new Asiakastieto(config).buildTimestamp(consecutiveNumber);
      console.log('timestamp: ', timestamp);

      validateTimestamp(timestamp, consecutiveNumber);
      expect(timestamp.substr(17, 5)).to.equal('%2B02');
    });

    it.skip('Should return a formatted timestamp that matches required format(+0 GMT): YYYYMMDDHHMMSSXXTZNNNNNN', () => {
      // i.e: 2008021514330000%2B0200001
      const consecutiveNumber = (Math.floor(Math.random() * (99999 - 1 + 1)) + 1);
      const timestamp = new Asiakastieto(config).buildTimestamp(consecutiveNumber);
      console.log('timestamp: ', timestamp);

      validateTimestamp(timestamp, consecutiveNumber);
      expect(timestamp.substr(17, 2)).to.equal('00');
    });
  });

  describe('Calculate checksum', () => {
    /*
      The checksum (the SHA-512 hash value) is presented as a hexadecimal character string of 128
      characters, in which letter symbols are capital letters.
      userid&enduser&timestamp&key&
    */
    it('Should calculate a valid SHA-512 checksum', () => {
      const params = {
        enduser: 'cccccc',
        timestamp: '2005110112264400%2B0200001'
      };
      const checksum = new Asiakastieto(config).calculateChecksum(params);
      expect(checksum.length).to.equal(checksumDemo.length);
    });
  });

  describe('Basic parameters', () => {
    it('Should throw an error if idnumber is missing ', () => {
      delete basicParams.idnumber;
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /idnumber is mandatory/);
    });
    it('Should throw an error if idnumber format is not valid', () => {
      basicParams.idnumber = '123456789';
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /idnumber format is not valid/);
    });
    it('Should throw an error if enduser is missing', () => {
      delete basicParams.enduser;
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /enduser is mandatory/);
    });
    it('Should throw an error if enduser format is not valid', () => {
      basicParams.enduser = 'enduserinvalidformat';
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /enduser format is not valid/);
    });
    it('Should throw an error if sequence is missing', () => {
      delete basicParams.sequence;
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /sequence/);
    });
    it('Should throw an error if sequence is not a valid number', () => {
      basicParams.sequence = 'a1324';
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /Must be a valid number/);
    });
    it('Should throw an error if language is not valid (FI, EN, SV)', () => {
      basicParams.lang = 'ES';
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /locale is not valid/);
    });
    it('Should throw an error if ccenter is too long', () => {
      basicParams.ccenter = 'costcenterinvalidformat';
      expect(() => new Asiakastieto(config).createUrlWithBasicParameters(basicParams)).to.throw(Error, /ccenter is not valid/);
    });

    it('Should build a valid URL with basic parameters', () => {
      const urlObject = new Asiakastieto(config).createUrlWithBasicParameters(basicParams);
      // Check specific values per service are not set
      expect(urlObject.searchParams.get('reqmsg')).to.equal(null);
      expect(urlObject.searchParams.get('request')).to.equal(null);
      expect(urlObject.searchParams.get('qtype')).to.equal(null);
      expect(urlObject.searchParams.get('level')).to.equal(null);
      expect(urlObject.searchParams.get('purpose')).to.equal(null);
    });
  });

  describe('Consumer information', () => {
    /* Example URL:
      https://demo.asiakastieto.fi/services/consumer5/REST?version=2018
        &lang=FI
        &userid=nnnnnnnnnnnn
        &passwd=xxxxxx
        &enduser=ccccc
        &reqmsg=CONSUMER
        &idnumber=ddmmyyAnnnX
        &purpose=1
        &qtype=41
        &format=xml
        &timestamp=2004070713434000%2B0200001
        &checksum=xxxxxxxxxxxxxxxxxxxxxxxxxxx&
    */
    it('Should build a valid URL for payment default check', () => {
      const url = new Asiakastieto(config).buildDefaultCheckUrl(basicParams);
      const urlObject = new URL(url);
      validateBasicUrlParams(urlObject, config, basicParams);

      // Check specific values per service
      expect(urlObject.searchParams.get('reqmsg')).to.equal('CONSUMER');
      expect(urlObject.searchParams.get('request')).to.equal('H');
      expect(urlObject.searchParams.get('qtype')).to.equal('41');
      expect(urlObject.searchParams.get('level')).to.equal('');
      expect(urlObject.searchParams.get('purpose')).to.equal('1');
    });

    /* Example URL:
      https://demo.asiakastieto.fi/services/consumer5/REST?version=2018
        &lang=FI
        &userid=nnnnnnnnnnnn
        &passwd=xxxxxx
        &enduser=ccccc
        &reqmsg=CONSUMER
        &idnumber=ddmmyyAnnnX
        &purpose=1
        &qtype=41
        &level=1
        &format=xml
        &timestamp=2004070713434000%2B0200001
        &checksum=xxxxxxxxxxxxxxxxxxxxxxxxxxx&
     */
    it('Should build a valid URL for Credit information check', () => {
      const url = new Asiakastieto(config).buildInformationCheckUrl(basicParams);
      const urlObject = new URL(url);
      validateBasicUrlParams(urlObject, config, basicParams);

      // Check specific values per service
      expect(urlObject.searchParams.get('reqmsg')).to.equal('CONSUMER');
      expect(urlObject.searchParams.get('request')).to.equal('H');
      expect(urlObject.searchParams.get('qtype')).to.equal('42');
      expect(urlObject.searchParams.get('level')).to.equal('');
      expect(urlObject.searchParams.get('purpose')).to.equal('1');
    });
  });

  describe('Decision support service', () => {
    /* Example URL:
      https://demo.asiakastieto.fi/services/consumer5/REST?version=2018
        &userid=nnnnnnnnnnnn
        &passwd= xxxxx
        &enduser=ccccc
        &idnumber=ddmmyyAnnnX
        &reqmsg=DECISION
        &qtype=02
        &model=MALLI1
        &C6_input.code%5B0%5D=A05
        &C6_input.value%5B0%5D=1000
        &C6_input.code%5B1%5D=A08
        &C6_input.value%5B1%5D=123456
        &request=H
        &format=xml
        &timestamp=2005110112264400%2B0 200001
        &checksum=xxxxxxxx&
    */

    it('Should build a valid URL with mandatory parameters', () => {
      const url = new Asiakastieto(config).buildDecisionSupportServiceUrl(basicParams);
      const urlObject = new URL(url);
      validateBasicUrlParams(urlObject, config, basicParams);
      expect(urlObject.searchParams.get('reqmsg')).to.equal('DECISION');
      expect(urlObject.searchParams.get('request')).to.equal('H');
      expect(urlObject.searchParams.get('qtype')).to.equal('02');
    });

    it('Should build a valid URL with full parameters (model, A05, A08)', () => {
      basicParams.model = 'MALL';
      basicParams.creditAmount = 1200;
      basicParams.customerKey = '1234';
      const url = new Asiakastieto(config).buildDecisionSupportServiceUrl(basicParams);
      const urlObject = new URL(url);
      validateBasicUrlParams(urlObject, config, basicParams);
      const leftBracketUtf8 = '%5B';
      const rightBracketUtf8 = '%5D';
      // Check specific values per service
      expect(urlObject.searchParams.get('reqmsg')).to.equal('DECISION');
      expect(urlObject.searchParams.get('request')).to.equal('H');
      expect(urlObject.searchParams.get('qtype')).to.equal('02');
      expect(urlObject.searchParams.get('model')).to.equal(basicParams.model);
      expect(urlObject.searchParams.get('C6_input.code%5B0%5D')).to.equal('A05');
      expect(urlObject.searchParams.get('C6_input.value%5B0%5D', basicParams.creditAmount.toString()));
      expect(urlObject.searchParams.get('C6_input.code%5B0%5D', 'A08'));
      expect(urlObject.searchParams.get('C6_input.value%5B0%5D', basicParams.customerKey.toString()));
    });
  });

  describe('Simppeli', () => {
    /* Example URL:
      https://demo.asiakastieto.fi/services/consumer5/REST?userid=nnnnnnnnnnnn
        &passwd=XXXXXX
        &enduser=cccccc
        &idnumber=ddmmyyAnnnX
        &purpose=1
        &request=H
        &lang=FImodel=SIMP1
        &version=2018
        &qtype=04
        &reqmsg=DECISION
        &format=xml
        &timestamp=2008021514330000%2B0200001
        &checksum=xxxxxxxxxxx&
    */

    it('Should build a valid URL without model', () => {
      const url = new Asiakastieto(config).buildSimppeliUrl(basicParams);
      const urlObject = new URL(url);
      validateBasicUrlParams(urlObject, config, basicParams);

      // Check specific values per service
      expect(urlObject.searchParams.get('reqmsg')).to.equal('DECISION');
      expect(urlObject.searchParams.get('request')).to.equal('H');
      expect(urlObject.searchParams.get('qtype')).to.equal('04');
    });

    it('Should build a valid URL with model included', () => {
      basicParams.model = 'SIMP1';
      const url = new Asiakastieto(config).buildSimppeliUrl(basicParams);
      const urlObject = new URL(url);
      validateBasicUrlParams(urlObject, config, basicParams);

      expect(urlObject.searchParams.get('model')).to.equal(basicParams.model);
    });
  });

  describe('Nordic Person information', () => {
    it('Should throw an error if country is not valid (SWE, NOR, DNK)', () => {
      basicParams.country = 'FIN';
      expect(() => new Asiakastieto(config).buildNordicPersonInfoUrl(basicParams)).to.throw(Error, /country is not valid/);
    });

    it('Should build a valid URL', () => {
      basicParams.country = 'DNK';
      const url = new Asiakastieto(config).buildNordicPersonInfoUrl(basicParams);
      const urlObject = new URL(url);
      validateBasicUrlParams(urlObject, config, basicParams);

      // Check specific values per service
      expect(urlObject.searchParams.get('reqmsg')).to.equal('CONSUMER');
      expect(urlObject.searchParams.get('qtype')).to.equal('12');
      expect(urlObject.searchParams.get('country')).to.equal(basicParams.country);
      expect(urlObject.searchParams.get('qmsg')).to.equal('P3');
    });
  });

  describe('Do GET Request', () => {
    it('Should thrown an error if errorMessage(errorCode, errorText) is found in XML response', () => {
      sinon.stub(config, 'requestPromise').resolves(authenticationFailureXml);
      expect(new Asiakastieto(config).doRequestAndParseXML(apiUrl)).to.be.rejectedWith(Error);
    });

    it('Should thrown an error if XML error found', () => {
      sinon.stub(config, 'requestPromise').resolves(versionFailureXml);
      expect(new Asiakastieto(config).doRequestAndParseXML(apiUrl)).to.be.rejectedWith(Error);
    });

    it('Should get and parse Generic error XML response to JSON', () => {
      sinon.stub(config, 'requestPromise').resolves(genericErrorXml);
      expect(new Asiakastieto(config).doRequestAndParseXML(apiUrl)).to.be.rejectedWith(Error);
    });

    it('Should get and parse consumer default check response from XML to JSON', async () => {
      sinon.stub(config, 'requestPromise').resolves(defaultCheckResponseXml);
      const data = await new Asiakastieto(config).doRequestAndParseXML(apiUrl);
      expect(validator.isJSON(JSON.stringify(data))).to.equal(true);
    });
  });
});
