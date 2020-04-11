function OptionTest() {
  return GetOptionQuote();
}

function GetOptionQuote(underlying, optionType, strike, date) {
  return ImportJSONOAuth("https://api.tdameritrade.com/v1/marketdata/chains?symbol=TSLA&contractType=CALL&includeQuotes=TRUE&strike=820&fromDate=2021-01-15&toDate=2021-01-15",
    json => parseOptionChain(json, ["volatility", "delta", "gamma", "vega", "theta"]));
}

function parseOptionChain(json, properties) {

  var table = [];
  var callExpDateMap = json["callExpDateMap"];
  for (var expiry in callExpDateMap) {
    for (var strike in callExpDateMap[expiry]) {
      for (var option of callExpDateMap[expiry][strike]) {
        var row = [];
        for (var property of properties) {
          row.push(option[property]);
        }
        table.push(row);
      }
    }
  }
  return table;
}

function ImportJSONOAuth(url, parser) {
  var service = getTDService();
  if (service.hasAccess()) {
    var header = { headers: { Authorization: "Bearer " + service.getAccessToken() } };
    var jsondata = UrlFetchApp.fetch(url, header);
    var object = JSON.parse(jsondata.getContentText());
    return parser(object);
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s',
      authorizationUrl);
  }
}


function getTDService() {
  return OAuth2.createService('TD OptionsAnalysis')
    .setAuthorizationBaseUrl('https://auth.tdameritrade.com/auth')
    .setTokenUrl('https://api.tdameritrade.com/v1/oauth2/token')
    .setClientId('JYQDQXEXSG0DGVBGGP0YOVMOGAOLNBDM@AMER.OAUTHAP')
    .setClientSecret('N/A')  // TD doesn't require this but the OAuth library does.
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setParam('access_type', 'offline');
}

/**
 * Handles the OAuth callback.
 */
function authCallback(request) {
  var service = getTDService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}