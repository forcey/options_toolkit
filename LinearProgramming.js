// contracts: [
//  {
//   "name": "XYZ 1/21 100 Call"
//   "underlying": "XYZ"
//   "current": 123.0
//   "low": 23.0
//   "flat": 100.0
//   "high": 300.0,
//   "multiplier": 100,
//  },
//  {...}
// ]
function LinearProgramming(contracts, maxCost, maxLoss, maxCarry) {
    var engine = LinearOptimizationService.createEngine();

    var costConstraint = engine.addConstraint(0, maxCost)
    var lossConstraint = engine.addConstraint(maxLoss, 0)
    var carryConstraint = engine.addConstraint(maxCarry, 0)
    for (var contract of contracts) {
        engine.addVariable(contract.name, 0, 1e9, LinearOptimizationService.VariableType.INTEGER);

        var multiplier = "multiplier" in contract ? contract.multiplier : 1;

        costConstraint.setCoefficient(contract.name, contract.current * multiplier);
        lossConstraint.setCoefficient(contract.name, (contract.low - contract.current) * multiplier);
        carryConstraint.setCoefficient(contract.name, (contract.flat - contract.current) * multiplier);
        engine.setObjectiveCoefficient(contract.name, (contract.high - contract.current) * multiplier);
    }

    // Engine should maximize the objective
    engine.setMaximization();

    // Solve the linear program
    var solution = engine.solve();
    if (!solution.isValid()) {
        Logger.log('No solution ' + solution.getStatus());
    } else {
        for (var contract of contracts) {
            var value = solution.getVariableValue(contract.name)
            if (value > 0) {
                Logger.log(contract.name + ': ' + value);
            }
        }
    }
}

function getOptionChain(underlying, targetDate, targetLow, targetHigh) {
    const url = createURL("https://api.tdameritrade.com/v1/marketdata/chains",
        {
            "symbol": underlying,
            "contractType": "CALL",
            "includeQuotes": "TRUE",
            "fromDate": targetDate.toISOString(),
        });
    Logger.log(url);
    return ImportJSONOAuth(url, json => toContracts_(json, targetDate, targetLow, targetHigh));
}

function timeToExpiry(option, targetDate) {
    return (option.expirationDate - targetDate.getTime()) / (365 * 86400 * 1000);
}

// Converts TD response to array of contracts.
function toContracts_(json, targetDate, targetLow, targetHigh) {
    if (json.status != "SUCCESS") {
        return [];
    }

    var underlying = {
        "name": json.underlying.symbol,
        "underlying": json.underlying.symbol,
        "current": json.underlying.mark,
        "low": targetLow,
        "flat": json.underlying.mark,
        "high": targetHigh,

    };
    var contracts = [underlying];

    var map = json["callExpDateMap"];
    for (var expiry in map) {
        for (var strike in map[expiry]) {
            for (var option of map[expiry][strike]) {
                var contract = {
                    "name": option.description,
                    "underlying": json.underlying.symbol,
                    "current": option.mark,
                    "low": CallOption(targetLow, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, targetDate)),
                    "flat": CallOption(json.underlying.mark, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, targetDate)),
                    "high": CallOption(targetHigh, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, targetDate)),
                    "multiplier": option.multiplier,
                }
                contracts.push(contract);
            }
        }
    }
    return contracts;
}

function LinearProgrammingTest() {
    var contracts = getOptionChain("GOOG", new Date(2020, 8, 1), 1500, 1000);
    Logger.log(contracts);
    LinearProgramming(contracts, 50000, -10000, -1000);
}
