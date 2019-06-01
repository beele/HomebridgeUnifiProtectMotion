const Unifi = require("./unifi").Unifi;
const Flows = require("./flows").Flows;
const RequestMocking = require("./mocking/request-mocking").RequestMocking;

const Mocks = new RequestMocking();

beforeEach(() => {
    console.log('resetting modules!');
    jest.resetModules();
    jest.resetAllMocks();
    jest.setTimeout(10000);
});

test('Flows-authenticationFlow-not-preauthenticated', done => {
    const requestMock = Mocks.mockAuthenticationGetRequest(1);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.authenticationFlow()
        .then(() => {
            expect(flows.session).not.toBeUndefined();
            expect(flows.session).not.toBeNull();

            expect(requestMock).toBeCalledTimes(2);

            done();
        });
});
test('Flows-authenticationFlow-preauthenticated', done => {
    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.session = {
        token: 'dummy-session-token',
        timestamp: Date.now()
    };

    flows.authenticationFlow()
        .then(() => {
            expect(flows.session).not.toBeUndefined();
            expect(flows.session).not.toBeNull();

            done();
        });
});
test('Flows-authenticationFlow-authenticate-unreachable', done => {
    const requestMock = Mocks.mockAuthenticationGetRequest();

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.authenticationFlow()
        .then(() => {
            fail('When authentication is impossible a reject should occur!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            expect(requestMock).toBeCalledTimes(3);

            done();
        })
});


test('Flows-enumerateMotionSensorsFlow-not-preauthenticated', done => {
    const m1 = Mocks.mockAuthenticationGetRequest(1, false);
    const m2 = Mocks.mockCamerasGetRequest(1);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.enumerateMotionSensorsFlow()
        .then(() => {
            expect(flows.session).not.toBeUndefined();
            expect(flows.session).not.toBeNull();
            expect(flows.sensors).not.toBeUndefined();
            expect(flows.sensors).not.toBeNull();
            expect(flows.sensors.length).toEqual(2);

            expect(m1).toBeCalledTimes(2);
            expect(m2).toBeCalledTimes(2);

            done();
        });
});
test('Flows-enumerateMotionSensorsFlow-preauthenticated', done => {
    const requestMock = Mocks.mockCamerasGetRequest(1);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.session = {
        token: 'dummy-session-token',
        timestamp: Date.now()
    };

    flows.enumerateMotionSensorsFlow()
        .then(() => {
            expect(flows.sensors).not.toBeUndefined();
            expect(flows.sensors).not.toBeNull();
            expect(flows.sensors.length).toEqual(2);

            expect(requestMock).toBeCalledTimes(2);

            done();
        });
});
test('Flows-enumerateMotionSensorsFlow-authenticate-unreachable', done => {
    const m1 = Mocks.mockAuthenticationGetRequest(1, true);
    const m2 = Mocks.mockCamerasGetRequest(1);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.enumerateMotionSensorsFlow()
        .then(() => {
            fail('When authentication is impossible a reject should occur!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            expect(m1).toBeCalledTimes(2);
            expect(m2).toBeCalledTimes(0);

            done();
        })
});
test('Flows-enumerateMotionSensorsFlow-enumerateMotionSensorsForCameras-unreachable', done => {
    const m1 = Mocks.mockAuthenticationGetRequest(1, false);
    const m2 = Mocks.mockCamerasGetRequest(1, true);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.enumerateMotionSensorsFlow()
        .then(() => {
            fail('When switch retrieval is impossible a reject should occur!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            expect(m1).toBeCalledTimes(2);
            expect(m2).toBeCalledTimes(2);

            done();
        })
});


test('Flows-detectMotionFlow-not-preauthenticated', done => {
    const m1 = Mocks.mockAuthenticationGetRequest(1, false);
    const m2 = Mocks.mockGetMotionEventsRequest(1, false);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.sensors = [
        {id: 'cam-1'},
        {id: 'cam-2'}
    ];

    flows.detectMotionFlow()
        .then((result) => {
            expect(result).not.toBeUndefined();
            expect(result).not.toBeNull();
            expect(result.length).toEqual(2);

            expect(m1).toBeCalledTimes(2);
            expect(m2).toBeCalledTimes(2);

            done();
        })
        .catch((error) => {
            fail('No reject should occur!');
        });
});
test('Flows-detectMotionFlow-preauthenticated', done => {
    const m1 = Mocks.mockAuthenticationGetRequest(1, false);
    const m2 = Mocks.mockGetMotionEventsRequest(1, false);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.session = {
        authorization: 'dummy-auth',
        timestamp: Date.now()
    };

    flows.sensors = [
        {id: 'cam-1'},
        {id: 'cam-2'}
    ];

    flows.detectMotionFlow()
        .then((result) => {
            expect(result).not.toBeUndefined();
            expect(result).not.toBeNull();
            expect(result.length).toEqual(2);

            expect(m1).toBeCalledTimes(0);
            expect(m2).toBeCalledTimes(2);

            done();
        })
        .catch((error) => {
            fail('No reject should occur!');
        });
});
test('Flows-detectMotionFlow-unsuccessful-state', done => {
    const m1 = Mocks.mockAuthenticationGetRequest(1, false);
    const m2 = Mocks.mockGetMotionEventsRequest(1, true);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.detectMotionFlow()
        .then((result) => {
            fail('No resolve should occur!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            expect(m1).toBeCalledTimes(2);
            expect(m2).toBeCalledTimes(2);

            done();
        });
});
test('Flows-detectMotionFlow-authenticate-unreachable', done => {
    const m1 = Mocks.mockAuthenticationGetRequest();
    const m2 = Mocks.mockGetMotionEventsRequest(1, true);

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.detectMotionFlow()
        .then((result) => {
            fail('No resolve should occur!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            expect(m1).toBeCalledTimes(3);
            expect(m2).toBeCalledTimes(0);

            done();
        });
});
test('Flows-detectMotionFlow-setSwitchState-unreachable', done => {
    const m1 = Mocks.mockAuthenticationGetRequest(1, false);
    const m2 = Mocks.mockGetMotionEventsRequest();

    const logger = (message) => console.log(message);
    const unifi = new Unifi('https://dummy-host', 50, 10000, 1000, 3, logger);
    const flows = new Flows(unifi, 'dummy-username', 'dummy-password', logger);

    flows.detectMotionFlow()
        .then((result) => {
            fail('No resolve should occur!');
        })
        .catch((error) => {
            expect(error).not.toBeUndefined();
            expect(error).not.toBeNull();

            expect(m1).toBeCalledTimes(2);
            expect(m2).toBeCalledTimes(3);

            done();
        });
});