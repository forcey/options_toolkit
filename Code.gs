function OptionTest() {
  return GetOptionQuote("I/W14BZ6zjOlsg+4JNcMWE6k0/El91PHlIlcxc/Sk3XefsCO/LJIFMPkWBlH+gsEBfnGI02vG2BXgsheDEr+SAv57Q4BTP4yFWNLr7i0dG9lxvUzu/ODuUUsjfWpmu+6FDtW0UC4SORjzDFwMQdfJpfuHEWRBlOse/eSBfB/sIqR7TdQ6fPG5vUJVaCYv1n2WFn3uYGS6H8wyASRiW2kW8QoC4hbIfI1cZ/8WIhvnJAdeZx5MpI4FZkmiqTsnRUIxj6kwv4GiufsAiSg45Bju3/rJqVoxp9g0xY5pL6foEWF4RBzMoPc0iVm8/1H8AIKa7cKg4VPAw7njQpyF5u3SlazAFKS44xRtHvfdH5dG1NfC2ybVuiRTpKzsRRJT7fEa2h8ETnevhu9mkrG3vrt/soDEFh19/qvoRrUa+176VejemfckOTZYAoLVVNuwAdR1ijdBBuSHXXcKGxS9HDuboNZDCiKY6z9QuYsYJDkXoxjM6ky+sJ9CZQIrltT3EVLnDb1uey3UtVz/dSjjwcXBCopz/9100MQuG4LYrgoVi/JHHvl4QL5QWvxYXbxUhA4Y8l3MTA/xD+tToBS5+rQZA0p7g25cwvebQEDzrSAJeXGlTxVr9/ZXRQBM+XtF62f37xcr4k53pQuLTX8LXyhP2b3hie9MnM1YBFMs8mqC9b0lLJGxsy+q5ZLGl86iNNs+KjZ3ZoE7s85tD4I7+qxr1pmV+garWSUPROglUwIg7gl1WYyDlBMGECM0ZJC1MMf3XMLF+6uQNnaAXelp0gNmzJhVfrVlTYnhXuEIxHShSQ76am0YEw2B3a3IR7SwDQlXSqMSr4ovU0ErQ9cV8/TS+wlkhP9Gtt6ATnyGTB5TxFVV+JFI0jyIR8WoO8RcHlZbcDhqj6IYeQV+l4vjVjpK8u5EmYXHjkEKMWc6OXL3Bz1dVrWGFHxT4idPdDO5sOyfGASNRYSvw2VXApKKdJ2lvdtYZ1Y32iQKIFJu9QWafcKEjVzJjoCENtE6GUiAYxoKioGo8QMJOge/l+omuouxyojRL/iLHseYH6JZMoaWcs5pdUk8Nv8l9VsrqOZL71DBDP4Sy/+no4=212FD3x19z9sWBHDJACbC00B75E");
}

function GetOptionQuote(authenticationCode, underlying, optionType, strike, date) {
  return ImportJSONOAuth("https://api.tdameritrade.com/v1/marketdata/chains?symbol=TSLA&contractType=CALL&includeQuotes=TRUE&strike=820&fromDate=2021-01-15&toDate=2021-01-15",
                         authenticationCode, 
                         ["volatility","delta","gamma","vega","theta"]);
}

function ImportJSONOAuth(url, authenticationCode, properties) {
  var header = {headers: {Authorization: "Bearer " + authenticationCode}};
  var jsondata = UrlFetchApp.fetch(url, header);
  var object   = JSON.parse(jsondata.getContentText());
  
  var table = [];
  var callExpDateMap = object["callExpDateMap"];
  for (var expiry in callExpDateMap) {
    for (var strike in callExpDateMap[expiry]) {
      for each (var option in callExpDateMap[expiry][strike]) {
        var row = [];
        for each (var property in properties) {
          row.push(option[property]);
        }
        table.push(row);
      }
    }
  }
  return table;
}

