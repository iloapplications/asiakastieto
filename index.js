'use strict';

const crypto = require('crypto');
const parser = require('xml2js');
const util = require('util');

const stagUrl = 'https://demo.asiakastieto.fi/services/consumer5/REST';
const prodUrl = 'https://www.asiakastieto.fi/services/consumer5/REST';

function validateConfig (config) {
  if (!config.requestPromise) {
    throw new Error('Configuration: requestPromise is mandatory');
  }
  if (config.isProd && typeof (config.isProd) !== 'boolean') {
    throw new Error('Configuration: isProd must be a boolean');
  }
  if (!config.userid) {
    throw new Error('Configuration: userid is mandatory');
  }
  if (config.userid.length !== 12) {
    throw new Error('Configuration: userid is invalid (length must be 12 chars)');
  }
  if (!config.passwd) {
    throw new Error('Configuration: passwd is mandatory');
  }
  if (config.passwd.length > 10) {
    throw new Error('Configuration: passwd is too large (maximum 10 chars)');
  }
  if (!config.shaKey) {
    throw new Error('Configuration: shaKey is missing');
  }
}

function validateMandatory (params) {
  if (!params.idnumber) {
    throw new Error('Validation: idnumber is mandatory');
  }
  if (params.idnumber.length > 11) {
    throw new Error('Validation: idnumber format is not valid (too long)');
  }
  if (params.idnumber.length < 11) {
    throw new Error('Validation: idnumber format is not valid (too short)');
  }
  if (!params.enduser) {
    throw new Error('Validation: enduser is mandatory');
  }
  if (params.enduser.length > 12) {
    throw new Error('Validation: enduser format is not valid (too long)');
  }
  if (!params.sequence || isNaN(params.sequence)) {
    throw new Error('Validation: sequence is not valid. Must be a valid number');
  }
}

function validateOptional (params) {
  if (params.lang && !['FI', 'EN', 'SV'].includes(params.lang)) {
    throw new Error('Validation: locale is not valid (only FI, EN or SV are valid)');
  }
  if (params.ccenter && params.ccenter.length > 20) {
    throw new Error('Validation: ccenter is not valid (too long)');
  }
}

function validateDecisionSupportService (params) {
  if (params.model && params.model.length > 6) {
    throw new Error('Validation: model format is not valid (too long)');
  }
  if (params.creditAmount && (isNaN(params.creditAmount) || params.creditAmount < 0)) {
    throw new Error('Validation: creditAmount must be a valid positive number');
  }
  if (params.customerKey && params.customerKey.length > 30) {
    throw new Error('Validation: customerKey format is not valid (too large)');
  }
}

function validateNordicPersonInformation (params) {
  if (params.country && !['SWE', 'NOR', 'DNK'].includes(params.country)) {
    throw new Error('Validation: country is not valid (only SWE, NOR or DNK are allowed');
  }
}

module.exports = function Asiakastieto (config) {
  const apiUrl = config.isProd ? prodUrl : stagUrl;
  validateConfig(config);

  function buildTimestamp (consecutiveNumber) {
    const date = new Date();
    let offset = date.getTimezoneOffset();

    if (offset !== 0) {
      offset = (offset < 0 ? '%2D' : '%2B') + (Math.abs(offset) / 60).toString().padStart(2, '0');
    } else {
      offset = offset.toString().padStart(2, '0');
    }

    return date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0') +
      date.getHours().toString().padStart(2, '0') +
      date.getMinutes().toString().padStart(2, '0') +
      date.getSeconds().toString().padStart(2, '0') +
      date.getMilliseconds().toString().padStart(3, '0') +
      offset +
      consecutiveNumber.toString().padStart(5, '0');
  }

  function calculateChecksum (userid, enduser, timestamp, secret) {
    const dataString = userid + '&' + enduser + '&' + timestamp + '&' + secret + '&';

    return (crypto.createHash('sha512')).update(dataString, 'utf8').digest('hex').toUpperCase();
  }

  function createUrlWithBasicParameters (params) {
    validateMandatory(params);
    validateOptional(params);

    const url = new URL(apiUrl);
    // Add mandatory parameters
    url.searchParams.append('userid', config.userid);
    url.searchParams.append('passwd', config.passwd);
    url.searchParams.append('enduser', params.enduser);
    url.searchParams.append('idnumber', params.idnumber);
    url.searchParams.append('version', 2018);
    url.searchParams.append('format', 'xml');
    const timestamp = buildTimestamp(params.sequence);
    url.searchParams.append('timestamp', timestamp);
    url.searchParams.append('checksum', calculateChecksum(config.userid, params.enduser, timestamp, config.shaKey));
    // Add voluntary parameters
    if (params.lang) {
      url.searchParams.append('lang', params.lang);
    }
    if (params.ccenter) {
      url.searchParams.append('ccenter', params.ccenter);
    }

    return url;
  }

  function buildDefaultCheckUrl (params) {
    const url = createUrlWithBasicParameters(params);

    url.searchParams.append('reqmsg', 'CONSUMER');
    url.searchParams.append('request', 'H');
    url.searchParams.append('qtype', 41);
    url.searchParams.append('level', '');
    url.searchParams.append('purpose', 1);

    return url.href;
  }

  function buildInformationCheckUrl (params) {
    const url = createUrlWithBasicParameters(params);

    url.searchParams.append('reqmsg', 'CONSUMER');
    url.searchParams.append('request', 'H');
    url.searchParams.append('qtype', 42);
    url.searchParams.append('level', '');
    url.searchParams.append('purpose', 1);

    return url.href;
  }

  function buildDecisionSupportServiceUrl (params) {
    const url = createUrlWithBasicParameters(params);
    validateDecisionSupportService(params);
    url.searchParams.append('reqmsg', 'DECISION');
    url.searchParams.append('request', 'H');
    url.searchParams.append('qtype', '02');

    if (params.model) {
      url.searchParams.append('model', params.model);
    }

    const leftBracketStr = '%5B';
    const rightBracketStr = '%5D';
    if (params.creditAmount) {
      url.searchParams.append(`C6_input.code${leftBracketStr}0${rightBracketStr}`, 'A05');
      url.searchParams.append(`C6_input.value${leftBracketStr}0${rightBracketStr}`, params.creditAmount);
    }
    if (params.customerKey) {
      url.searchParams.append(`C6_input.code${leftBracketStr}1${rightBracketStr}`, 'A08');
      url.searchParams.append(`C6_input.value${leftBracketStr}1${rightBracketStr}`, params.customerKey);
    }

    return url.href;
  }

  function buildSimppeliUrl (params) {
    const url = createUrlWithBasicParameters(params);

    url.searchParams.append('reqmsg', 'DECISION');
    url.searchParams.append('request', 'H');
    url.searchParams.append('qtype', '04');
    if (params.model) {
      url.searchParams.append('model', params.model);
    }

    return url.href;
  }

  function buildNordicPersonInfoUrl (params) {
    const url = createUrlWithBasicParameters(params);
    validateNordicPersonInformation(params);
    url.searchParams.append('reqmsg', 'CONSUMER');
    url.searchParams.append('qtype', '12');
    url.searchParams.append('purpose', 1);
    url.searchParams.append('country', params.country);
    url.searchParams.append('qmsg', 'P3');

    return url.href;
  }

  async function doRequestAndParseXML (url) {
    const rpOptions = { method: 'GET', uri: url };
    const response = await config.requestPromise(rpOptions);

    const parserOptions = {
      tagNameProcessors: [name => name.replace(/ns[2,3,4]:/gi, '')],
      explicitArray: false
    };

    const data = await util.promisify(parser.parseString.bind(parser))(response, parserOptions);
    const consumerResponse = data && data.response && data.response.consumerResponse;
    if (!consumerResponse) {
      throw new Error('Unable to parse XML response');
    }
    if (consumerResponse.errorMessage) {
      throw new Error('Error in XML response: ' + JSON.stringify(consumerResponse.errorMessage, null, 2));
    }

    return consumerResponse;
  }

  return {
    calculateChecksum,
    buildTimestamp,
    createUrlWithBasicParameters,
    buildDefaultCheckUrl,
    buildInformationCheckUrl,
    buildDecisionSupportServiceUrl,
    buildSimppeliUrl,
    buildNordicPersonInfoUrl,
    doRequestAndParseXML
  };
};
