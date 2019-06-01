const request = require('request-promise-native');

////////////////////////////////////////////
/// Mock request calls to HomeWizard API ///
////////////////////////////////////////////
module.exports.RequestMocking = function () {
    const me = this;

    me.mockAuthenticationGetRequest = function (succeedAfterAttempt = -1, responseContainsError = false) {
        const mock = jest.spyOn(request, 'post');

        let count = 0;
        mock.mockImplementation((opts) => {
            console.log('Mock called');

            if (succeedAfterAttempt === -1) {
                return Promise.reject('dummy-fail');
            } else {
                if (count++ < succeedAfterAttempt) {
                    return Promise.reject('dummy-fail');
                } else {
                    if (responseContainsError) {
                        return Promise.resolve({error: 'dummy-fail'});
                    }
                    return Promise.resolve({headers: {authorization: 'dummy-auth'}});
                }
            }
        });
        return mock;
    };

    me.mockCamerasGetRequest = function (succeedAfterAttempt = -1) {
        const mock = jest.spyOn(request, 'get');

        let count = 0;
        mock.mockImplementation((opts) => {
            console.log('Mock called');

            if (succeedAfterAttempt === -1) {
                return Promise.reject('dummy-fail');
            } else {
                if (count++ < succeedAfterAttempt) {
                    return Promise.reject('dummy-fail');
                } else {
                    return Promise.resolve(me.getCamerasReplyData());
                }
            }

        });
        return mock;
    };
    me.getCamerasReplyData = function () {
        const reply = {
            body: {
                cameras: []
            }
        };
        for (let i = 0; i < 2; i++) {
            const camera = {
                id: 'dummy-id',
                name: 'dummy-name',
                host: 'dummy-host',
                mac: 'dummy-mac'
            };
            reply.body.cameras.push(camera);
        }
        return reply;
    };

    me.mockGetMotionEventsRequest = function (succeedAfterAttempt = -1, responseContainsError = false) {
        const mock = jest.spyOn(request, 'get');

        let count = 0;
        mock.mockImplementation((opts) => {
            console.log('Mock called');

            if (succeedAfterAttempt === -1) {
                return Promise.reject('dummy-fail');
            } else {
                if (count++ < succeedAfterAttempt) {
                    return Promise.reject('dummy-fail');
                } else {
                    if (responseContainsError) {
                        return Promise.resolve({body: {error: 'Failed'}});
                    }
                    return Promise.resolve({body: [{camera: 'cam-1', score: 10}, {camera: 'cam-2', score: 30}, {camera: 'cam-1', score: 50}, {camera: 'cam-2', score: 70}]});
                }
            }
        });
        return mock;
    };

    me.mockAuthenticationAndPlugsGetRequests = function (succeedAfterAttempt = -1, responseContainsError = false, callToFail = -1) {
        const mock = jest.spyOn(request, 'get');

        let countCall1 = 0;
        let countCall2 = 0;
        mock.mockImplementation((opts) => {
            console.log('Mock called');

            if (opts.uri === 'https://cloud.homewizard.com/account/login') {
                if (callToFail === 1) {
                    return Promise.reject('dummy-fail');
                } else {
                    if (countCall1++ < succeedAfterAttempt) {
                        return Promise.reject('dummy-fail');
                    } else {
                        if (responseContainsError) {
                            return Promise.resolve({error: 110, message: 'dummy-fail'});
                        }
                        return Promise.resolve({session: 'dummy-session-token'});
                    }
                }
            } else {
                if (callToFail === 2) {
                    return Promise.reject('dummy-fail');
                } else {
                    if (countCall2++ < succeedAfterAttempt) {
                        return Promise.reject('dummy-fail');
                    } else {
                        return Promise.resolve(me.getPlugsReplyData());
                    }
                }
            }
        });
        return mock;
    }
};