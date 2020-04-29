// Adapted from https://excelatfinance.com/xlf17/xlf-black-scholes-google-sheets.php
// Greeks formula from https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model#The_Greeks

function d1_(Stock, Exercise, Rate, Sigma, Time) {
  return (Math.log(Stock / Exercise) + (Rate + Sigma * Sigma / 2.0) * Time) / (Sigma * Math.sqrt(Time));
}

function d2_(Stock, Exercise, Rate, Sigma, Time) {
  return d1_(Stock, Exercise, Rate, Sigma, Time) - Sigma * Math.sqrt(Time);
}

/* ================================================== 
   The Black and Scholes (1973) formula for an option on a non dividend stock 
   - Stock: underlying price
   - Exercise: strike price
   - Rate: interest rate
   - Sigma: volatility
   - Time: time to expiry in years.
   - OptType "c" for Call, else for Put
 */
function OptionPrice(Stock, Exercise, Rate, Sigma, Time, OptType) {
  if (Time <= 0) return 0;

  var d1, d2;
  d1 = d1_(Stock, Exercise, Rate, Sigma, Time);
  d2 = d2_(Stock, Exercise, Rate, Sigma, Time);

  if (OptType == "c" || OptType == "Call")
    return Stock * xlfNormSDist(d1) - Exercise * Math.exp(-Rate * Time) * xlfNormSDist(d2);
  else
    return Exercise * Math.exp(-Rate * Time) * xlfNormSDist(-d2) - Stock * xlfNormSDist(-d1);
}

function CallOption(Stock, Exercise, Rate, Sigma, Time) {
  return OptionPrice(Stock, Exercise, Rate, Sigma, Time, "c");
}

function PutOption(Stock, Exercise, Rate, Sigma, Time) {
  return OptionPrice(Stock, Exercise, Rate, Sigma, Time, "p");
}

function OptionDelta(Stock, Exercise, Rate, Sigma, Time, OptType) {
  if (Time <= 0) return 0;

  var d1 = d1_(Stock, Exercise, Rate, Sigma, Time);
  if (OptType == "c" || OptType == "Call") {
    return xlfNormSDist(d1);
  } else {
    return xlfNormSDist(d1) - 1;
  }
}

function OptionGamma(Stock, Exercise, Rate, Sigma, Time) {
  var d1 = d1_(Stock, Exercise, Rate, Sigma, Time);
  var npd1 = xlfNormalPDF1a(d1, 0, 1);
  return npd1 / (Stock * Sigma * Math.sqrt(Time));
}

function OptionTheta(Stock, Exercise, Rate, Sigma, Time, OptType) {
  var d1 = d1_(Stock, Exercise, Rate, Sigma, Time);
  var d2 = d2_(Stock, Exercise, Rate, Sigma, Time);

  var npd1 = xlfNormalPDF1a(d1, 0, 1);
  var nd2 = xlfNormSDist(d2);

  var term1 = -Stock * npd1 * Sigma / (2 * Math.sqrt(Time));
  var term2 = Rate * Exercise * Math.exp(-Rate * Time) * nd2;

  // This theta is based on trading days.
  if (OptType == "c" || OptType == "Call") {
    return (term1 - term2) / 252;
  } else {
    return (term1 + term2) / 252;
  }
}

function OptionVega(Stock, Exercise, Rate, Sigma, Time) {
  var d1 = d1_(Stock, Exercise, Rate, Sigma, Time);
  var npd1 = xlfNormalPDF1a(d1, 0, 1);

  // Vega for 1% change in volatility.
  return Stock * npd1 * Math.sqrt(Time) / 100;
}

/* ================================================== */
/* The cummulative Normal distribution function: */
function xlfNormSDist(x) {

  // constants
  var a = 0.2316419;
  var a1 = 0.31938153;
  var a2 = -0.356563782;
  var a3 = 1.781477937;
  var a4 = -1.821255978;
  var a5 = 1.330274429;

  if (x < 0.0)
    return 1 - xlfNormSDist(-x);
  else
    var k = 1.0 / (1.0 + a * x);
  return 1.0 - Math.exp(-x * x / 2.0) / Math.sqrt(2 * Math.PI) * k
    * (a1 + k * (a2 + k * (a3 + k * (a4 + k * a5))));
}

/* ================================================== */
/* The Normal distribution probability density function (PDF)
   for the specified mean and specified standard deviation: */
function xlfNormalPDF1a(x, mu, sigma) {
  var num = Math.exp(-Math.pow((x - mu), 2) / (2 * Math.pow(sigma, 2)))
  var denom = sigma * Math.sqrt(2 * Math.PI)
  return num / denom
}

function xlfNormalPDF1b(x, mu, sigma) {
  var num = Math.exp(- 1 / 2 * Math.pow((x - mu) / sigma, 2))
  var denom = sigma * Math.sqrt(2 * Math.PI)
  return num / denom
}



/* ================================================== */
/* The Normal distribution probability density function (PDF)
   for the standard normal distribution: */
function xlfNormalSdistPDF(z) {
  var num = Math.exp(-0, 5 * x * x)
  var denom = Math.sqrt(2 * Math.PI)
  return num / denom
}


