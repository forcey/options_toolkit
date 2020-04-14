function GetOptionQuote(underlying, optionType, strike, date, properties) {
  Logger.log(properties);

  const url = createURL("https://api.tdameritrade.com/v1/marketdata/chains",
    {
      "symbol": underlying,
      "contractType": optionType.toUpperCase(),
      "includeQuotes": "TRUE",
      "strike": strike,
      "fromDate": date.toISOString().split('T')[0],
      "toDate": date.toISOString().split('T')[0]
    });
  Logger.log(url);
  return ImportJSONOAuth(url,
    json => parseOptionChain_(json, properties.flat()));
}

function createURL(path, params) {
  const ret = [];
  for (let key in params)
    ret.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
  return path + '?' + ret.join('&');
}

function parseOptionChain_(json, properties) {
  var table = [];
  var map = json["callExpDateMap"];
  if (Object.keys(map).length === 0) {
    map = json["putExpDateMap"];
  }
  for (var expiry in map) {
    for (var strike in map[expiry]) {
      for (var option of map[expiry][strike]) {
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

  var loginMutex = LockService.getDocumentLock();
  loginMutex.tryLock(5000);
  const hasAccess = service.hasAccess();
  loginMutex.releaseLock();

  if (hasAccess) {
    var header = { headers: { Authorization: "Bearer " + service.getAccessToken() } };
    var jsondata = UrlFetchApp.fetch(url, header);
    Logger.log(jsondata.getContentText());
    var object = JSON.parse(jsondata.getContentText());
    return parser(object);
  } else {
    return "Please login first.";
  }
}
