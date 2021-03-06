const Flows = require("./unifi/flows").Flows;
const Unifi = require("./unifi/unifi").Unifi;

/*
Configuration example
See the readme for detailed information

"platforms": [
    {
        "platform": "Unifi-Protect-Motion",
        "name": "display-name",
        "room": "room-name",
        "controller": "https://url-to-controller:7443",
        "username": "user@domain.tld",
        "password": "password",
        "motionscore": 50,
        "motioninterval": 15000,
        "delay": 500,
        "retries": 2
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
            config['motionscore']       ? config['motionscore']     : 50,
            config['motioninterval']    ? config['motioninterval']  : 15000,
            config['delay']             ? config['delay']           : 500,
            config['retries']           ? config['retries']         : 2,
            log
        ),
        config['username'],
        config['password'],
        log
    );

    if (api) {
        platform.api = api;

        platform.api.on('didFinishLaunching', () => {
            platform.log('Platform API loaded!');

            if (platform.accessories.length > 0) {
                platform.log('Accessories restored from cache!');
                platform.flows
                    .authenticationFlow()
                    .then(() => {
                        platform.log('Authenticated, session stored!');
                        return platform.flows.enumerateMotionSensorsFlow();
                    })
                    .then((sensors) => {
                        platform.log('Checking for new and removed sensors...');
                        const toAdd = sensors.filter(function(sensor) {
                            return !platform.accessories.some(function(accessory) {
                                return sensor.id === accessory.context.id;
                            });
                        });
                        const toRemove = platform.accessories.filter(function(accessory) {
                            return !sensors.some(function(sensor) {
                                return accessory.context.id === sensor.id;
                            });
                        });
                        toRemove.forEach((accessory) => {
                            platform.removeAccessory(accessory);
                        });
                        toAdd.forEach((sensor) => {
                            platform.addAccessory(sensor);
                        });

                        platform.log('Done!');
                        return Promise.resolve();
                    })
                    .then(() => {
                        platform.setMotionCheckInterval(config['motioninterval'] ? config['motioninterval'] : 15000);
                        platform.checkMotion();
                    });
            } else {
                platform.log('No Accessories in cache, creating...');
                platform.flows
                    .enumerateMotionSensorsFlow()
                    .then((sensors) => {
                        for (const sensor of sensors) {
                            platform.addAccessory(sensor);
                        }
                        platform.log('Done!');

                        platform.setMotionCheckInterval();
                        platform.checkMotion();
                    })
                    .catch((error) => {
                        platform.log("Could not get sensors: " + error);
                    });
            }
        });
    }
}

UnifiProtectMotionPlatform.prototype = {
    setMotionCheckInterval: function (delay) {
        setInterval(this.checkMotion.bind(this), delay);
    },

    checkMotion: function () {
        const platform = this;

        platform.flows.detectMotionFlow(platform.accessories).then((accessoriesWithMotionInfo) => {
            for (const accessoryWithMotionInfo of accessoriesWithMotionInfo) {
                accessoryWithMotionInfo
                    .getService(Service.MotionSensor)
                    .setCharacteristic(Characteristic.MotionDetected, accessoryWithMotionInfo.context.hasMotion);
            }
        });
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

    removeAccessory: function (accessory) {
        const platform = this;
        platform.log('Deleting for accessory: ' + accessory.displayName);

        if (accessory) {
            platform.api.unregisterPlatformAccessories('homebridge-unifi-protect-motion', 'Unifi-Protect-Motion', [accessory]);
            platform.accessories.splice(platform.accessories.indexOf(accessory), 1);
        }
    }
};