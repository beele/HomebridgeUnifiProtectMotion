const Flows = require("./unifi/flows").Flows;
const Unifi = require("./unifi/unifi").Unifi;

/*
Configuration example

"platforms": [
    {
        "platform": "Unifi-Protect-Motion",
        "name": "display-name",
        "room": "room-name",
        "controller": "url-to-controller",
        "username": "user@domain.tld",
        "password": "password",
        "delay": "delay-in-milliseconds",
        "retries": "number-of-retries"
    }
]
*/

let Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
    Accessory = homebridge.platformAccessory;

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform('homebridge-unifi-protect-motion', 'Unifi-Protect-Motion', UnifiProtectMotionPlatform, true);
};

function UnifiProtectMotionPlatform(log, config, api) {
    log('Unifi-Protect-Motion Platform Init');
    const platform = this;

    this.log = log;
    this.accessories = [];

    this.flows = new Flows(
        new Unifi(
            config['controller'],
            config['delay'],
            config['retries'],
            log
        ),
        config['username'],
        config['password'],
        log
    );

    if (api) {
        platform.api = api;

        platform.api.on('didFinishLaunching', function () {
            platform.log('Platform API loaded!');

            if (platform.accessories.length > 0) {
                platform.log('Accessories restored from cache!');
                platform.flows.authenticationFlow()
                    .then(() => {
                        platform.log('Authenticated, session stored!');
                        platform.flows.enumerateMotionSensorsFlow()
                            .then(() => {
                                platform.motionCheck();
                            })
                    });
            } else {
                platform.log('No Accessories in cache, creating...');
                platform.flows.enumerateMotionSensorsFlow()
                    .then((sensors) => {
                        for (const sensor of sensors) {
                            platform.addAccessory(sensor);
                        }
                        platform.motionCheck();
                    })
                    .catch((error) => {
                        platform.log("Could not get sensors: " + error);
                    });
            }
        }.bind(this));
    }
}

UnifiProtectMotionPlatform.prototype = {
    motionCheck: function () {
        const platform = this;

        setInterval(() => {
            platform.flows.detectMotionFlow().then((motionEnhancedSensors) => {

                outer: for (const sensor of motionEnhancedSensors) {
                    platform.log(sensor.name + ' : ' + motionEnhancedSensors.motion ? 'motion' : 'no motion');

                    for (const accessory of platform.accessories) {
                        if (sensor.id === accessory.context.id) {
                            accessory.context.hasMotion = sensor.motion;
                            accessory.getService(Service.MotionSensor)
                                .setCharacteristic(Characteristic.MotionDetected, sensor.motion);
                            continue outer;
                        }
                    }

                }
            });
        }, 15000);
    },

    addAccessory: function (sensor) {
        const platform = this;

        const uuid = UUIDGen.generate(sensor.name);
        const newAccessory = new Accessory(sensor.name, uuid);

        newAccessory.context = {id: sensor.id, hasMotion: false};
        newAccessory.addService(Service.MotionSensor, sensor.name);

        platform.api.registerPlatformAccessories('homebridge-unifi-protect-motion', 'Unifi-Protect-Motion', [newAccessory]);
        platform.configureAccessory(newAccessory);
    },
    configureAccessory: function (accessory) {
        const platform = this;
        platform.accessories.push(accessory);

        const id = accessory.context.id;
        platform.log('Configuring ' + id);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, 'Ubiquiti Networks')
            .setCharacteristic(Characteristic.Model, 'Unifi Protect Camera')
            .setCharacteristic(Characteristic.SerialNumber, id);

        accessory.getService(Service.MotionSensor)
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', (callback) => {
                callback(null, accessory.context.hasMotion);
            });

        accessory.on('identify', function (paired, callback) {
            platform.log(accessory.displayName, "Identify!!!");
            callback();
        });
    },

    //TODO: When restoring from cache, check available vs cached switches, delete ones that are no longer available and create new ones!
    removeAccessory: function (name) {
        const platform = this;
        platform.log('Delete requested for: ' + name);

        let switchToRemove;
        platform.accessories.forEach(value => {
            if (value.displayName === name) {
                switchToRemove = value;
            }
        });

        if (switchToRemove) {
            platform.api.unregisterPlatformAccessories('homebridge-unifi-protect-motion', 'Unifi-Protect-Motion', [switchToRemove]);
            platform.accessories.splice(platform.accessories.indexOf(switchToRemove), 1);
        }
    }
};