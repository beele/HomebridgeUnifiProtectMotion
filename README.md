#HOMEBRIDGE UNIFI PROTECT CAMERA MOTION SENSOR

[![Build Status](https://travis-ci.com/beele/HomebridgeUnifiProtectMotion.svg?branch=master)](https://travis-ci.com/beele/HomebridgeUnifiProtectMotion)

This Homebridge plugin generates a motion sensor per unifi protect camera that is registered on the provided account.

To install this plugin simple type `sudo npm install homebridge-unifi-protect-motion-sensors -g --unsafe-perm=true`.
Next open the config.json that contains your Homebridge configuration and add a block like the following one to the platforms array:

```javascript
{
    "platform": "Unifi-Protect-Motion",
    "name": "display-name",
    "room": "room-name",
    "controller": "url-to-controller",
    "username": "user@domain.tld",
    "password": "password",
    "motionscore": "minimum-motion-score-in-percentage",
    "motioninterval": "delay-in-milliseconds",
    "delay": "delay-in-milliseconds",
    "retries": "number-of-retries"
}
```

The platform name has to be `Unifi-Protect-Motion` to link to the plugin.<br/>
The `name` and `room` fields are for the display name and room name inside of the HomeKit app.<br/>
The `controller` field is the bare url where your unifi protect is hosted (cloud key gen2+), most likely `https://cloud-key-ip:7443`.<br/>
The `username` and `password` fields are your unifi protect login credentials.<br/>
The `motionscore` field is the minimum score that will register as a motion event. The default in the unifi protect software is 50 (0 to 100, omit the % sign).<br/>
The `motioninterval` field is the amount of milliseconds that are between each check, each check is one call to the unifi protect api. A sane default is 10 or 15 seconds.<br/>
The `delay` and `retries` fields specify the initial delay between the calls and the amount of retries to the unifi Protect API should any of the calls fail.<br/>
Each subsequent call will double the previous delay up to the maximum amount of retries specified. 500 milliseconds and 2 retries are a good default.

All the motion sensors are automatically enumerated and added as accessories. One for each camera<br/>
Each motion sensor will be available as a separate accessory in the Home app.

To enable rich motion notifications:

- Go to the settings of the sensor in the Home app
- Enable notifications for the sensor
- Put the sensor in the same room as the corresponding camera is! 
    - You can add the unifi cameras to the Home app by following [this guide](https://community.ubnt.com/t5/UniFi-Protect/UniFi-Protect-with-HomeKit-Setup-Guide/td-p/2576090)
- whenever motion is detected you will get a notification from the home app with a snapshot from the camera

Tested with:

- Ubiquiti UniFi CloudKey Gen2 Plus - Cloud key with unifi protect functionality
  <br/>![CloudKey Gen2 Plus](resources/img/cloudkey-gen2plus.jpg?raw=true "CloudKey Gen2 Plus")
- 2x Ubiquiti UniFi Video UVC-G3-AF - PoE Camera
  <br/>![Camera UVC-G3-AF](resources/img/camera.jpeg?raw=true "Camera UVC-G3-AF")
  