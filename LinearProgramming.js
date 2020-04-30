// contracts: [
//  {
//   "name": "XYZ 1/21 100 Call",
//   "underlying": "XYZ",
//   "current": 123.0,
//   "low": 23.0,
//   "flat": 100.0,
//   "high": 300.0,
//   "multiplier": 100,
//   "pinned": 200,
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
        var pinned = "pinned" in contract ? contract.pinned : 0;
        engine.addVariable(contract.name, pinned, 1e9, LinearOptimizationService.VariableType.INTEGER);

        var cost = contract.current * contract.multiplier;
        var loss = (contract.low - contract.current) * contract.multiplier;
        var flat = (contract.flat - contract.current) * contract.multiplier;
        var gain = (contract.high - contract.current) * contract.multiplier;

        costConstraint.setCoefficient(contract.name, cost);
        lossConstraint.setCoefficient(contract.name, loss);
        carryConstraint.setCoefficient(contract.name, flat);
        engine.setObjectiveCoefficient(contract.name, gain);

        if (!(contract.underlying in underlyingConstraints)) {
            // Each underlying must occupy 5% - 50% of total portfolio.
            underlyingConstraints[contract.underlying] = engine.addConstraint(0.05 * maxCost, 0.5 * maxCost);
        }

        var underlyingConstraint = underlyingConstraints[contract.underlying];
        underlyingConstraint.setCoefficient(contract.name, cost);
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

            var value = solution.getVariableValue(contract.name)
            if (value > 0) {
                result.positions[i] = value;
                result.cost += value * contract.current * contract.multiplier;
                result.max_loss += value * (contract.low - contract.current) * contract.multiplier;
                result.carry_cost += value * (contract.flat - contract.current) * contract.multiplier;
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

    var underlying = getStock(json.underlying.symbol, json.underlying.mark, targetLow, targetHigh);
    var contracts = [underlying];

    var map = json["callExpDateMap"];
    for (var expiry in map) {
        for (var strike in map[expiry]) {
            for (var option of map[expiry][strike]) {
                var contract = {
                    "name": option.description,
                    "underlying": json.underlying.symbol,
                    //"current": CallOption(json.underlying.mark, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, new Date())),
                    "current": option.mark,
                    "low": CallOption(targetLow, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, targetDate)),
                    "flat": CallOption(json.underlying.mark, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, targetDate)),
                    "high": CallOption(targetHigh, option.strikePrice, 0, option.volatility / 100, timeToExpiry(option, targetDate)),
                    "multiplier": option.multiplier,
                    "delta": option.delta,
                    "strike": option.strikePrice,
                    "expiry": new Date(option.expirationDate),
                    "instrument": "Call",
                }
                contracts.push(contract);
            }
        }
    }
    return contracts;
}

function getStock(symbol, current, low, high) {
    return {
        "name": symbol,
        "underlying": symbol,
        "current": current,
        "low": low,
        "flat": current,
        "high": high,
        "delta": 1,
        "multiplier": 1,
        "instrument": "Stock",
    };
}

function LinearProgrammingTest() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[4];

    var range = sheet.getRange("LinearProgrammingInput");
    var outputRange = sheet.getRange("LinearProgrammingOutput");

    var outputColumns = [
        { "title": "Name", "field": "name" },
        { "title": "Underlying", "field": "underlying" },
        { "title": "Instrument", "field": "instrument" },
        { "title": "Strike", "field": "strike" },
        { "title": "Expiry", "field": "expiry" },
        { "title": "Multiplier", "field": "multiplier" },
        { "title": "Position", "field": "position" },
        { "title": "Current Price", "field": "current" },
        { "title": "Low Price", "field": "low" },
        { "title": "Flat Price", "field": "flat" },
        { "title": "High Price", "field": "high" },
        { "title": "Delta", "field": "delta" },
    ];
    outputRange.clearContent();
    for (var i = 0; i < outputColumns.length; i++) {
        outputRange.getCell(1, i + 1).setValue(outputColumns[i].title);
    }

    var contracts = [];
    for (var row = 2; row <= range.getHeight(); row++) {
        var symbol = range.getCell(row, 1).getValue();
        var current = range.getCell(row, 2).getValue();
        var targetDate = range.getCell(row, 3).getValue();
        var low = range.getCell(row, 4).getValue();
        var high = range.getCell(row, 5).getValue();
        var options = range.getCell(row, 6).getValue();

        if (options) {
            var chain = getOptionChain(symbol, targetDate, low, high);
            contracts.push(...chain);
        } else {
            var stock = getStock(symbol, current, low, high);
            contracts.push(stock);
        }
    }

    var result = LinearProgramming(contracts, 340000, -150000, -15000);
    Logger.log(result);
    var row = 2;
    for (var i in result.positions) {
        contracts[i].position = result.positions[i];
        Logger.log(contracts[i]);

        for (var column = 0; column < outputColumns.length; column++) {
            outputRange.getCell(row, column + 1).setValue(contracts[i][outputColumns[column].field]);
        }
        row++;
    }
}
