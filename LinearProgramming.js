function LinearProgramming() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[2];

    var range = sheet.getRange("A1:H564");

    // The row and column here are relative to the range
    // getCell(1,1) in this code returns the cell at B2, B2
    var cell = range.getCell(1, 1);
    Logger.log(cell.getValue());

    var engine = LinearOptimizationService.createEngine();

    var costConstraint = engine.addConstraint(0, 10000)
    var lossConstraint = engine.addConstraint(-6250, 1e6)
    var carryConstraint = engine.addConstraint(-1250, 1e6)
    for (var row = 2; row <= 564; row++) {
        var cellName = "I" + row
        engine.addVariable(cellName, 0, 100, LinearOptimizationService.VariableType.INTEGER);

        var asset = range.getCell(row, 1).getValue();
        var multiplier = asset == "Stock" ? 1 : 100;

        costConstraint.setCoefficient(cellName, range.getCell(row, 2).getValue() * multiplier);
        lossConstraint.setCoefficient(cellName, range.getCell(row, 6).getValue());
        carryConstraint.setCoefficient(cellName, range.getCell(row, 7).getValue());
        engine.setObjectiveCoefficient(cellName, range.getCell(row, 8).getValue());
    }

    // Engine should maximize the objective
    engine.setMaximization();

    // Solve the linear program
    var solution = engine.solve();
    if (!solution.isValid()) {
        Logger.log('No solution ' + solution.getStatus());
    } else {
        for (var row = 2; row <= 564; row++) {
            var cellName = "I" + row
            var value = solution.getVariableValue(cellName)
            if (value > 0)
                Logger.log(range.getCell(row, 1).getValue() + ': ' + solution.getVariableValue(cellName));
        }
    }
}
