import config from './config';

const ItemType = {
    BALLOON: 0,
    UMBRELLA: 4,
    HAT: 18,
    TSHIRT: 20
};

// Extract values from ItemType
var itemTypeValues = Object.keys(ItemType).map(function(key) {
    return ItemType[key as keyof typeof ItemType];
});

export var pluginName = config.getString('MOD_NAME');
var pluginWindow: Window;
export var pluginEnabled = true;
var actionSubscription: IDisposable;

const DEFAULT_COLORS = {
    [ItemType.BALLOON]: 7,
    [ItemType.UMBRELLA]: 28,
    [ItemType.HAT]: 28,
    [ItemType.TSHIRT]: 28,
};
var COLORS = {
    [ItemType.BALLOON]: DEFAULT_COLORS[ItemType.BALLOON],
    [ItemType.UMBRELLA]: DEFAULT_COLORS[ItemType.UMBRELLA],
    [ItemType.HAT]: DEFAULT_COLORS[ItemType.HAT],
    [ItemType.TSHIRT]: DEFAULT_COLORS[ItemType.TSHIRT],
};
var RANDOMNESS = {
    [ItemType.BALLOON]: true,
    [ItemType.UMBRELLA]: true,
    [ItemType.HAT]: true,
    [ItemType.TSHIRT]: true,
};

/**
Generates a random number between 0 and 31
*/
function getRandomColor(): number {
    return Math.floor(Math.random() * 32);
}

/**
Determines which of the items ID is the one that is used for the main color scheme
If the secondary item ID is 255, it means the stall sells only one item
If a stall sells 2 items, the one used for coloring is the secondary item
**/
function getColoredItemId(item1Id: number, item2Id: number) {
    var id = item1Id;
    
    if (itemTypeValues.indexOf(item1Id) !== -1) {
        id = item2Id;
    }
    return id;
}

function log(message: string) {
    console.log(message);
}

function log_object(obj: any) {
    log(JSON.stringify(obj, null, 4));
}

/**
Generates arguments for the ridesetappearance function.
A new color is chosen depending on the type of shop items sold by the stall
and whether the randomize setting is activated or not for that item
*/
function getNewColorSettings(ride: Ride, item1Id: number, item2Id: number) {
    var color: Number;
    
    if (RANDOMNESS[ride.type]) {
        color = getRandomColor();
        log("Random color: " + color);
    }
    else {
        var coloredItemId = getColoredItemId(item1Id, item2Id);
        log("Colored item ID: " + coloredItemId);
        color = COLORS[coloredItemId];
    }
    
    
    return {
        ride: ride.id,
        type: 0,
        value: color
    };
}

function getNewRandomnessSettings(ride: Ride, item1Id: number, item2Id: number) {
    var id = getColoredItemId(item1Id, item2Id);
    
    return {
        ride: ride.id,
        type: 8,
        value: RANDOMNESS[id]
    }
}

/**
Redraws the main window after a setting has been changed
*/
function updateWindow() {
    if (typeof pluginWindow != 'undefined' && pluginWindow.title != '') {
        (pluginWindow.findWidget("hat_picker") as ColourPickerWidget).colour =
            COLORS[0];
        (pluginWindow.findWidget("ts_picker") as ColourPickerWidget).colour =
            COLORS[1];
        (pluginWindow.findWidget("umb_picker") as ColourPickerWidget).colour =
            COLORS[2];
        (pluginWindow.findWidget("bal_picker") as ColourPickerWidget).colour =
            COLORS[3];
        
        (pluginWindow.findWidget("hat_random") as CheckboxWidget).isChecked =
            RANDOMNESS[ItemType.HAT];
        (pluginWindow.findWidget("ts_random") as CheckboxWidget).isChecked =
            RANDOMNESS[ItemType.TSHIRT];
        (pluginWindow.findWidget("umb_random") as CheckboxWidget).isChecked =
            RANDOMNESS[ItemType.UMBRELLA];
        (pluginWindow.findWidget("bal_random") as CheckboxWidget).isChecked =
            RANDOMNESS[ItemType.BALLOON];
    }
}

/**
Callback for the "Manage" checkbox.
Enables or disables the plugin.
*/
function enablePlugin(enabled: boolean) {
    pluginEnabled = enabled;
    if (pluginEnabled) {
        if (typeof actionSubscription === 'undefined') {
            initialize();
        }
    }
    else {
        destroy();
    }
}

/**
Opens the plugin window
*/
export function openMainWindow() {
    if (typeof pluginWindow != 'undefined') {
        pluginWindow.close();
    }
    pluginWindow = ui.openWindow({
        classification: pluginName,
        title: pluginName,
        width: 300,
        height: 190,
        widgets: [
            {
                type: "checkbox",
                name: "manage",
                x: 10,
                y: 20,
                width: 300,
                height: 20,
                isChecked: pluginEnabled,
                text: "Manage item colors for all new stalls",
                onChange: function(checked) {enablePlugin(checked);}
            },
            {
                type: "label",
                name: "hat_label",
                x: 15,
                y: 53,
                width: 80,
                height: 20,
                text: "HATS:"
            },
            {
                type: "colourpicker",
                name: "hat_picker",
                x: 100,
                y: 53,
                width: 20,
                height: 20,
                colour: COLORS[0],
                onChange: function(cn) {COLORS[0] = cn;}
            },
            {
                type: "checkbox",
                name: "hat_random",
                x: 130,
                y: 50,
                width: 170,
                height: 20,
                isChecked: RANDOMNESS[ItemType.HAT],
                text: "Random for every stall",
                onChange: function(checked) {RANDOMNESS[ItemType.HAT] = checked;}
            },
            {
                type: "label",
                name: "ts_label",
                x: 15,
                y: 73,
                width: 80,
                height: 20,
                text: "T-SHIRTS:"
            },
            {
                type: "colourpicker",
                name: "ts_picker",
                x: 100,
                y: 73,
                width: 20,
                height: 20,
                colour: COLORS[1],
                onChange: function(cn) {COLORS[1] = cn;}
            },
            {
                type: "checkbox",
                name: "ts_random",
                x: 130,
                y: 70,
                width: 170,
                height: 20,
                isChecked: RANDOMNESS[ItemType.TSHIRT],
                text: "Random for every stall",
                onChange: function(checked) {RANDOMNESS[ItemType.TSHIRT] = checked;}
            },
            {
                type: "label",
                name: "umb_label",
                x: 15,
                y: 93,
                width: 80,
                height: 20,
                text: "UMBRELLAS:"
            },
            {
                type: "colourpicker",
                name: "umb_picker",
                x: 100,
                y: 93,
                width: 20,
                height: 20,
                colour: COLORS[2],
                onChange: function(cn) {COLORS[2] = cn;}
            },
            {
                type: "checkbox",
                name: "umb_random",
                x: 130,
                y: 90,
                width: 170,
                height: 20,
                isChecked: RANDOMNESS[ItemType.UMBRELLA],
                text: "Random for every stall",
                onChange: function(checked) {RANDOMNESS[ItemType.UMBRELLA] = checked;}
            },
            {
                type: "label",
                name: "bal_label",
                x: 15,
                y: 113,
                width: 80,
                height: 20,
                text: "BALLOONS:"
            },
            {
                type: "colourpicker",
                name: "bal_picker",
                x: 100,
                y: 113,
                width: 20,
                height: 20,
                colour: COLORS[3],
                onChange: function(cn) {COLORS[3] = cn;}
            },
            {
                type: "checkbox",
                name: "bal_random",
                x: 130,
                y: 110,
                width: 170,
                height: 20,
                isChecked: RANDOMNESS[ItemType.BALLOON],
                text: "Random for every stall",
                onChange: function(checked) {RANDOMNESS[ItemType.BALLOON] = checked;}
            },
            {
                type: "button",
                name: "apply_all",
                x: 50,
                y: 150,
                width: 200,
                height: 20,
                text: "Apply to all existing stalls",
                onClick: function() {applyToAll();}
            }
        ]
    });
}

function applyToAll() {
    var allRides = map.rides;
    for (var i = 0; i < allRides.length; i++) {
        var ride = allRides[i];
        
        if (ride.type == 35 || ride.type == 32) {
            var itemId = ride.object.shopItem;
            var itemId2 = ride.object.shopItemSecondary;
            
            var ar = getNewColorSettings(ride, itemId, itemId2);
            log_object(ar);
            context.executeAction('ridesetappearance', ar);
            
            var randomness_settings = getNewRandomnessSettings(ride, itemId, itemId2);
            context.executeAction('ridesetappearance', randomness_settings);
        }
    }
}

/**
Initializes the plugin.
Subscribes to the action.execute API event
*/
export function initialize() {
    actionSubscription = context.subscribe('action.execute', function(actionArguments: GameActionEventArgs<RideSetSettingArgs>) {
        var action = actionArguments.action;
        var args = actionArguments.args;
        
        if (action == 'ridesetsetting') {
            var ride = map.getRide(args.ride);
            
            if (ride.type == 35 || ride.type == 32) {
                var itemId = ride.object.shopItem;
                var itemId2 = ride.object.shopItemSecondary;
                
                var ar = getNewColorSettings(ride, itemId, itemId2);
                context.executeAction('ridesetappearance', ar);
                
                var randomness_settings = getNewRandomnessSettings(ride, itemId, itemId2);
                context.executeAction('ridesetappearance', randomness_settings);
                
                updateWindow();
            }
        }
    });
}

/**
Stops the plugin and removes the API subscription.
Sets stalls preset colors back to default
*/
function destroy() {
    if (typeof actionSubscription != 'undefined') {
        actionSubscription.dispose();
    }
    
    if (typeof pluginWindow != 'undefined') {
        updateWindow();
        pluginWindow.close();
    }
}
