import {
    pluginName,
    openMainWindow,
    pluginEnabled,
    initialize,
} from './colorManager';

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
