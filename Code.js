function OptionTest() {
  return GetOptionQuote();
}

function GetOptionQuote(underlying, optionType, strike, date) {
  return ImportJSONOAuth("https://api.tdameritrade.com/v1/marketdata/chains?symbol=TSLA&contractType=CALL&includeQuotes=TRUE&strike=820&fromDate=2021-01-15&toDate=2021-01-15",
    json => parseOptionChain_(json, ["volatility", "delta", "gamma", "vega", "theta"]));
}

function parseOptionChain_(json, properties) {
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
    return "Please login first.";
  }
}
