// contracts: [
//  {
//   "name": "XYZ 1/21 100 Call",
//   "underlying": "XYZ",
//   "current": 123.0,
//   "low": 23.0,
//   "flat": 100.0,
//   "high": 300.0,
//   "multiplier": 100,
//  },
//  {...}
// ]
// Returns: {
//   positions: {0: 1, 1:10, 2:1, ...},
//   cost: 12345.0,
//   max_loss: -5000,
//   carry_cost: -1000,
//   max_gain: 20141.0,
// }
function LinearProgramming(contracts, maxCost, maxLoss, maxCarry) {
    var engine = LinearOptimizationService.createEngine();

    // underlying -> cost constraint
    var underlyingConstraints = {};

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

        if (!(contract.underlying in underlyingConstraints)) {
            // Each underlying must occupy 5% - 50% of total portfolio.
            underlyingConstraints[contract.underlying] = engine.addConstraint(0.05 * maxCost, 0.5 * maxCost);
        }

        var underlyingConstraint = underlyingConstraints[contract.underlying];
        underlyingConstraint.setCoefficient(contract.name, contract.current * multiplier);
    }

    // Engine should maximize the objective
    engine.setMaximization();

    // Solve the linear program
    var solution = engine.solve();
    if (!solution.isValid()) {
        return { "error": solution.getStatus() };
    } else {
        var result = {
            "positions": {},
            "cost": 0,
            "max_loss": 0,
            "carry_cost": 0,
            "max_gain": solution.getObjectiveValue(),
        }
        for (var i = 0; i < contracts.length; i++) {
            var contract = contracts[i];
            var multiplier = "multiplier" in contract ? contract.multiplier : 1;

            var value = solution.getVariableValue(contract.name)
            if (value > 0) {
                result.positions[i] = value;
                result.cost += value * contract.current * multiplier;
                result.max_loss += value * (contract.low - contract.current) * multiplier;
                result.carry_cost += value * (contract.flat - contract.current) * multiplier;
            }
        }
        return result;
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
                    "current": CallOption(json.underlying.mark, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, new Date())),
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
    var googChain = getOptionChain("GOOG", new Date(2020, 12, 31), 1000, 1500);
   
    var result = LinearProgramming(googChain, 350000, -175000, -20000);
    Logger.log(result);
    for (var i in result.positions) {
        Logger.log(contracts[i].name + ": " + result.positions[i]);
    }
}
