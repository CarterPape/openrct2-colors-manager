import {
    pluginName,
    openMainWindow,
    pluginEnabled,
    initialize,
} from './temp';

/**
Main function & plugin registration
*/
var main = function() {
    if (typeof ui === 'undefined') {
        return;
    }
    ui.registerMenuItem(pluginName, function () {
        openMainWindow();
    });
    if (pluginEnabled) {
        initialize();
    }
};

export default main;
