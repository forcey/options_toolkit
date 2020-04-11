function onOpen() {
    var ui = SpreadsheetApp.getUi();
    // Or DocumentApp or FormApp.
    ui.createMenu('Options Data')
        .addItem('Login to TD Ameritrade', 'login_')
        .addItem('Logout', 'logout_')
        .addToUi();
}

function getTDService() {
    return OAuth2.createService('TD OptionsAnalysis')
        .setAuthorizationBaseUrl('https://auth.tdameritrade.com/auth')
        .setTokenUrl('https://api.tdameritrade.com/v1/oauth2/token')
        .setClientId('JYQDQXEXSG0DGVBGGP0YOVMOGAOLNBDM@AMER.OAUTHAP')
        .setClientSecret('N/A')  // TD doesn't require this but the OAuth library does.
        .setCallbackFunction('authCallback_')
        .setPropertyStore(PropertiesService.getUserProperties())
        .setTokenPayloadHandler(tokenPayloadHandler_);
}

function tokenPayloadHandler_(payload) {
    payload['access_type'] = 'offline';
    return payload;
}

/**
 * Handles the OAuth callback.
 */
function authCallback_(request) {
    var service = getTDService();
    var authorized = service.handleCallback(request);
    if (authorized) {
        return HtmlService.createHtmlOutput('Success!');
    } else {
        return HtmlService.createHtmlOutput('Denied.');
    }
}

function login_() {
    var service = getTDService();
    var authorizationUrl = service.getAuthorizationUrl();
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'You can close the sidebar when the authorization is complete.');
    template.authorizationUrl = authorizationUrl;
    var page = template.evaluate();
    SpreadsheetApp.getUi().showSidebar(page);
}

function logout_() {
    var service = getTDService()
    service.reset();
}
