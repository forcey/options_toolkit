// contracts: [
//  {
//   "name": "XYZ 1/21 100 Call"
//   "underlying": "XYZ"
//   "current": 123.0
//   "lower": 23.0
//   "flat": 100.0
//   "upper": 300.0
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

        costConstraint.setCoefficient(contract.name, contract.current);
        lossConstraint.setCoefficient(contract.name, contract.lower - contract.current);
        carryConstraint.setCoefficient(contract.name, contract.flat - contract.current);
        engine.setObjectiveCoefficient(contract.name, contract.upper - contract.current);
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

function LinearProgrammingTest() {
    var tsla = {
        "name": "TSLA",
        "underlying": "TSLA",
        "current": 800,
        "lower": 400,
        "flat": 800,
        "upper": 1500,
    }
    var tsla820 = {
        "name": "TSLA 820 call",
        "underlying": "TSLA",
        "current": 18138,
        "lower": 612,
        "flat": 13667,
        "upper": 70583,
    }
    LinearProgramming([tsla, tsla820], 250000, -160000, -10000);
}