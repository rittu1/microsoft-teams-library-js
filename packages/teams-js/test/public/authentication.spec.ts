import { errorLibraryNotInitialized } from '../../src/internal/constants';
import { GlobalVars } from '../../src/internal/globalVars';
import { DOMMessageEvent } from '../../src/internal/interfaces';
import * as internalUtils from '../../src/internal/utils';
import { ErrorCode, FrameContexts, HostClientType, SdkError } from '../../src/public';
import * as app from '../../src/public/app/app';
import * as authentication from '../../src/public/authentication';
import { Utils } from '../utils';

/* eslint-disable */
/* As part of enabling eslint on test files, we need to disable eslint checking on the specific files with
   large numbers of errors. Then, over time, we can fix the errors and reenable eslint on a per file basis. */

describe('Testing authentication capability', () => {
  const errorMessage = 'Sample Error Message';
  const mockResult = 'someResult';
  const sdkError: SdkError = {
    errorCode: ErrorCode.INTERNAL_ERROR,
    message: errorMessage,
  };
  const mockResource = 'https://someresource/';
  const mockClaim = 'some_claim';
  const mockUser: authentication.UserProfile = {
    aud: 'test_aud',
    amr: ['test_amr'],
    iat: 0,
    iss: 'test_iss',
    family_name: 'test_family_name',
    given_name: 'test_given_name',
    unique_name: 'test_unique_name',
    oid: 'test_oid',
    sub: 'test_sub',
    tid: 'test_tid',
    exp: 0,
    nbf: 0,
    upn: 'test_upn',
    ver: 'test_ver',
  };
  const mockUserWithDataResidency = {
    ...mockUser,
    dataResidency: authentication.DataResidency.Public,
  };
  const allowedContexts = [
    FrameContexts.content,
    FrameContexts.sidePanel,
    FrameContexts.settings,
    FrameContexts.remove,
    FrameContexts.task,
    FrameContexts.stage,
    FrameContexts.meetingStage,
  ];

  function getEnumElementsNotInArray<E>(enumType: { [s: string]: E }, array: E[]): E[] {
    return Object.values(enumType).filter((value) => !array.includes(value));
  }

  const notAllowedContexts = getEnumElementsNotInArray(FrameContexts, allowedContexts);

  const allowedHostClientTypes = [
    HostClientType.desktop,
    HostClientType.android,
    HostClientType.ios,
    HostClientType.ipados,
    HostClientType.macos,
    HostClientType.visionOS,
    HostClientType.rigel,
    HostClientType.teamsRoomsWindows,
    HostClientType.teamsRoomsAndroid,
    HostClientType.teamsPhones,
    HostClientType.teamsDisplays,
    HostClientType.surfaceHub,
  ];

  describe('FRAMED - authentication tests', () => {
    let utils: Utils = new Utils();
    beforeEach(() => {
      utils = new Utils();
      utils.messages = [];
      // Set a mock window for testing
      app._initialize(utils.mockWindow);
    });
    afterEach(() => {
      app._uninitialize();
    });

    describe('Testing authentication.authenticate function', () => {
      beforeEach(() => {
        // For *almost* all of these tests we want setInterval to be a no-op, so we set it to immediately return 0
        utils.mockWindow.setInterval = (handler: Function, timeout: number): number => 0;
      });
      afterEach(() => {
        // After each test we reset setInterval to its normal value
        utils.mockWindow.setInterval = (handler: Function, timeout: number): number => setInterval(handler, timeout);
      });

      it('authentication.authenticate should not allow calls before initialization', () => {
        const authenticationParams: authentication.AuthenticatePopUpParameters = {
          url: 'https://someurl/',
          width: 100,
          height: 200,
        };
        expect(() => authentication.authenticate(authenticationParams)).toThrowError(errorLibraryNotInitialized);
      });

      allowedContexts.forEach((context) => {
        it(`authentication.authenticate should allow calls from ${context} context`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(context);

          const authenticationParams: authentication.AuthenticatePopUpParameters = {
            url: 'https://someurl/',
            width: 100,
            height: 200,
          };
          const promise = authentication.authenticate(authenticationParams);
          const message = utils.findMessageByActionName('authentication.authenticate');
          await utils.respondToMessage(message, true, mockResult);
          await expect(promise).resolves.toEqual(mockResult);
        });

        allowedHostClientTypes.forEach((hostClientType) => {
          it(`authentication.authenticate should successfully send authenticate message to ${hostClientType} client in legacy flow from ${context} context`, async () => {
            expect.assertions(5);
            await utils.initializeWithContext(context, hostClientType);
            const authenticationParams = {
              url: 'https://someUrl',
              width: 100,
              height: 200,
              isExternal: true,
            };

            authentication.authenticate(authenticationParams);
            const message = utils.findMessageByActionName('authentication.authenticate');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toBe(authenticationParams.url.toLowerCase() + '/');
            expect(message.args?.[1]).toBe(authenticationParams.width);
            expect(message.args?.[2]).toBe(authenticationParams.height);
            expect(message.args?.[3]).toBe(authenticationParams.isExternal);
          });

          it(`authentication.authenticate should throw an error in ${hostClientType} client if a URL that isn't https is passed in from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: 'http://someurl/',
              width: 100,
              height: 200,
            };

            await expect(authentication.authenticate(authenticationParams)).rejects.toThrowError(
              'Url should be a valid https url',
            );
          });

          it(`authentication.authenticate should throw an error in ${hostClientType} client if a URL that is more than 2048 characters long is passed in from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);

            let testUrl: string = 'https://';
            for (let i: number = 0; i < 2040; i++) {
              testUrl += 'a';
            }

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: testUrl,
              width: 100,
              height: 200,
            };

            await expect(authentication.authenticate(authenticationParams)).rejects.toThrowError(
              'Url exceeds the maximum size of 2048 characters',
            );
          });

          it(`authentication.authenticate should not contain script tags in ${hostClientType} client from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: encodeURI('https://example.com?param=<script>alert("Hello, world!");</script>'),
              width: 100,
              height: 200,
            };

            await expect(authentication.authenticate(authenticationParams)).rejects.toThrowError('Invalid Url');
          });

          it(`authentication.authenticate it should successfully handle auth success in a ${hostClientType} client in legacy flow from ${context} context`, (done) => {
            expect.assertions(1);
            utils.initializeWithContext(context, hostClientType).then(async () => {
              const authenticationParams = {
                url: 'https://someUrl',
                width: 100,
                height: 200,
                successCallback: (result: string) => {
                  expect(result).toEqual(mockResult);
                  done();
                },
                failureCallback: () => {
                  expect(true).toBe(false);
                  done();
                },
              };
              authentication.authenticate(authenticationParams);

              const message = utils.findMessageByActionName('authentication.authenticate');
              await utils.respondToMessage(message, true, mockResult);
            });
          });

          it(`authentication.authenticate should successfully ask parent window to open auth window with parameters including encoded url in ${hostClientType} client from ${context} context`, async () => {
            expect.assertions(6);
            await utils.initializeWithContext(context, hostClientType);

            jest.spyOn(internalUtils, 'fullyQualifyUrlString').mockImplementationOnce((urlString): URL => {
              return new URL('https://localhost/' + urlString);
            });

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: 'hello%20world',
              width: 100,
              height: 200,
              isExternal: true,
            };
            const promise = authentication.authenticate(authenticationParams);

            const message = utils.findMessageByActionName('authentication.authenticate');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toBe('https://localhost/hello%20world');
            expect(message.args?.[1]).toBe(authenticationParams.width);
            expect(message.args?.[2]).toBe(authenticationParams.height);
            expect(message.args?.[3]).toBe(authenticationParams.isExternal);

            await utils.respondToMessage(message, true, mockResult);
            await expect(promise).resolves.toEqual(mockResult);
          });

          it(`authentication.authenticate should handle auth failure with parameters in ${hostClientType} client from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);
            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: 'https://someurl',
              width: 100,
              height: 200,
              isExternal: true,
            };
            const promise = authentication.authenticate(authenticationParams);
            const message = utils.findMessageByActionName('authentication.authenticate');
            await utils.respondToMessage(message!, false, errorMessage);
            await expect(promise).rejects.toThrowError(errorMessage);
          });
        });
      });

      notAllowedContexts.forEach((context) => {
        it(`authentication.authenticate should not allow calls from ${context} context`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(context);
          const authenticationParams: authentication.AuthenticatePopUpParameters = {
            url: 'https://localhost/hello%20world',
            width: 100,
            height: 200,
          };

          expect(() => authentication.authenticate(authenticationParams)).toThrowError(
            `This call is only allowed in following contexts: ${JSON.stringify(
              allowedContexts,
            )}. Current context: "${context}".`,
          );
        });
      });
    });

    describe('Testing authentication.getAuthToken function', () => {
      it('authentication.getAuthToken should not allow calls before initialization', () => {
        const authTokenRequest = {
          resources: [mockResource],
          claims: [mockClaim],
          silent: false,
        };

        expect(() => authentication.getAuthToken(authTokenRequest)).toThrowError(new Error(errorLibraryNotInitialized));
      });

      it('authentication.getAuthToken should allow calls after initialization called, but before it finished', async () => {
        expect.assertions(2);

        const initPromise = app.initialize();
        const initMessage = utils.findMessageByActionName('initialize');

        authentication.getAuthToken();
        let message = utils.findMessageByFunc('authentication.getAuthToken');
        expect(message).toBeNull();
        await utils.respondToMessage(initMessage, 'content');
        await initPromise;
        message = utils.findMessageByFunc('authentication.getAuthToken');
        expect(message).not.toBeNull();
      });

      Object.values(FrameContexts).forEach((context) => {
        it(`authentication.getAuthToken should successfully return token in case of success in legacy flow from ${context} context`, (done) => {
          expect.assertions(5);
          utils.initializeWithContext(context).then(async () => {
            const authTokenRequest = {
              resources: [mockResource],
              claims: [mockClaim],
              silent: false,
              failureCallback: () => {
                done();
              },
              successCallback: (result) => {
                expect(result).toEqual('token');
                done();
              },
            };

            authentication.getAuthToken(authTokenRequest);

            const message = utils.findMessageByActionName('authentication.getAuthToken');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toEqual([mockResource]);
            expect(message.args?.[1]).toEqual([mockClaim]);
            expect(message.args?.[2]).toEqual(false);
            await utils.respondToMessage(message, true, 'token');
          });
        });

        it(`authentication.getAuthToken should successfully return error from getAuthToken in case of failure in legacy flow from ${context} context`, (done) => {
          expect.assertions(5);
          utils.initializeWithContext(context).then(async () => {
            const authTokenRequest = {
              resources: [mockResource],
              failureCallback: (error) => {
                expect(error).toEqual(errorMessage);
                done();
              },
              successCallback: () => {
                done();
              },
            };

            authentication.getAuthToken(authTokenRequest);

            const message = utils.findMessageByActionName('authentication.getAuthToken');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toEqual([mockResource]);
            expect(message.args?.[1]).toEqual(undefined);
            expect(message.args?.[2]).toEqual(undefined);

            await utils.respondToMessage(message, false, errorMessage);
          });
        });

        it(`authentication.getAuthToken should successfully return token in case of success from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const authTokenRequest = {
            resources: [mockResource],
            claims: [mockClaim],
            silent: false,
          };

          const promise = authentication.getAuthToken(authTokenRequest);

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toEqual([mockResource]);
          expect(message.args?.[1]).toEqual([mockClaim]);
          expect(message.args?.[2]).toEqual(false);

          await utils.respondToMessage(message, true, 'token');
          await expect(promise).resolves.toEqual('token');
        });

        it(`authentication.getAuthToken should successfully return token in case of success when using no authTokenRequest from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const promise = authentication.getAuthToken();

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toEqual(undefined);
          expect(message.args?.[1]).toEqual(undefined);
          expect(message.args?.[2]).toEqual(undefined);

          await utils.respondToMessage(message, true, 'token');
          await expect(promise).resolves.toEqual('token');
        });

        it(`authentication.getAuthToken should request token for the tenant specified in the authTokenRequest from ${context} context`, async () => {
          expect.assertions(6);
          await utils.initializeWithContext(context);

          const authTokenRequest = {
            resources: [mockResource],
            claims: [mockClaim],
            silent: false,
            tenantId: 'tenantId',
          };

          const promise = authentication.getAuthToken(authTokenRequest);

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toEqual([mockResource]);
          expect(message.args?.[1]).toEqual([mockClaim]);
          expect(message.args?.[2]).toEqual(false);
          expect(message.args?.[3]).toEqual('tenantId');

          utils.respondToMessage(message, true, 'token');
          await expect(promise).resolves.toEqual('token');
        });

        it(`authentication.getAuthToken should return error in case of failure from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const authTokenRequest: authentication.AuthTokenRequestParameters = {
            resources: [mockResource],
          };

          const promise = authentication.getAuthToken(authTokenRequest);

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toEqual([mockResource]);
          expect(message.args?.[1]).toEqual(undefined);
          expect(message.args?.[2]).toEqual(undefined);

          await utils.respondToMessage(message, false, errorMessage);
          await expect(promise).rejects.toThrowError(errorMessage);
        });

        it(`authentication.getAuthToken should return error in case of failure when using no authTokenRequest from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const promise = authentication.getAuthToken();

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toEqual(undefined);
          expect(message.args?.[1]).toEqual(undefined);
          expect(message.args?.[2]).toEqual(undefined);

          await utils.respondToMessage(message, false, errorMessage);
          await expect(promise).rejects.toThrowError(errorMessage);
        });
      });
    });

    describe('Testing authentication.getUser function', () => {
      it('authentication.getUser should not allow calls before initialization', () => {
        expect(() => authentication.getUser()).toThrowError(new Error(errorLibraryNotInitialized));
      });

      it('authentication.getUser should allow calls after initialization called, but before it finished', async () => {
        expect.assertions(2);

        const initPromise = app.initialize();
        const initMessage = utils.findMessageByActionName('initialize');

        authentication.getUser();
        let message = utils.findMessageByFunc('authentication.getUser');
        expect(message).toBeNull();

        await utils.respondToMessage(initMessage, 'content');

        await initPromise;

        message = utils.findMessageByFunc('authentication.getUser');
        expect(message).not.toBeNull();
      });

      Object.values(FrameContexts).forEach((context) => {
        it(`authentication.getUser should successfully get user profile in legacy flow with ${context} context`, (done) => {
          expect.assertions(3);
          utils.initializeWithContext(context).then(async () => {
            const successCallback = (user: authentication.UserProfile): void => {
              expect(user).toEqual(mockResult);
              done();
            };
            const failureCallback = (): void => {
              done();
            };
            const userRequest: authentication.UserRequest = {
              successCallback: successCallback,
              failureCallback: failureCallback,
            };
            authentication.getUser(userRequest);
            const message = utils.findMessageByActionName('authentication.getUser');
            expect(message.id).toBe(1);
            expect(message.args?.[0]).toBe(undefined);
            await utils.respondToMessage(message, true, mockResult);
          });
        });

        it(`authentication.getUser should throw error in getting user profile in legacy flow with ${context} context`, (done) => {
          expect.assertions(3);
          utils.initializeWithContext(context).then(async () => {
            const successCallback = (): void => {
              done();
            };
            const failureCallback = (reason: string): void => {
              expect(reason).toMatch(new RegExp(sdkError.message!));
              done();
            };
            const userRequest: authentication.UserRequest = {
              successCallback: successCallback,
              failureCallback: failureCallback,
            };
            authentication.getUser(userRequest);
            const message = utils.findMessageByActionName('authentication.getUser');
            expect(message.id).toBe(1);
            expect(message.args?.[0]).toBe(undefined);
            await utils.respondToMessage(message, false, sdkError);
          });
        });

        it(`authentication.getUser should throw error in getting user profile with ${context} context`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(context);
          const promise = authentication.getUser();
          const message = utils.findMessageByActionName('authentication.getUser');
          expect(message.id).toBe(1);
          expect(message.args?.[0]).toBe(undefined);
          await utils.respondToMessage(message, false, sdkError);
          await expect(promise).rejects.toThrowError(new RegExp(sdkError.message!));
        });

        it(`authentication.getUser should successfully get user profile with ${context} context`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(context);
          const promise = authentication.getUser();
          const message = utils.findMessageByActionName('authentication.getUser');
          expect(message.id).toBe(1);
          expect(message.args?.[0]).toBe(undefined);
          await utils.respondToMessage(message, true, mockUser);
          await expect(promise).resolves.toEqual(mockUser);
        });

        it(`authentication.getUser should successfully get user profile including data residency info with ${context} context if data residency is provided by hosts`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(context);
          const promise = authentication.getUser();
          const message = utils.findMessageByActionName('authentication.getUser');
          expect(message.id).toBe(1);
          expect(message.args?.[0]).toBe(undefined);
          await utils.respondToMessage(message, true, mockUserWithDataResidency);
          await expect(promise).resolves.toEqual(mockUserWithDataResidency);
        });
      });
    });

    describe('Testing authentication.notifySuccess function', () => {
      const allowedContexts = [FrameContexts.authentication];
      const notAllowedContexts = getEnumElementsNotInArray(FrameContexts, allowedContexts);

      it('authentication.notifySuccess should not allow calls before initialization', () => {
        expect(authentication.notifySuccess).toThrowError(errorLibraryNotInitialized);
      });

      allowedContexts.forEach((context) => {
        it(`authentication.notifySuccess should successfully notify auth success from ${context} context`, async () => {
          expect.assertions(2);
          await utils.initializeWithContext(context);

          authentication.notifySuccess(mockResult);
          const message = utils.findMessageByActionName('authentication.authenticate.success');
          expect(message.args?.length).toBe(1);
          expect(message.args?.[0]).toBe(mockResult);
        });
      });

      notAllowedContexts.forEach((context) => {
        it(`authentication.notifySuccess should not allow calls from ${context} context`, async () => {
          await utils.initializeWithContext(context);
          expect(authentication.notifySuccess).toThrowError(
            `This call is only allowed in following contexts: ${JSON.stringify(
              allowedContexts,
            )}. Current context: "${context}".`,
          );
        });
      });
    });

    describe('Testing authentication.notifyFailure', () => {
      const allowedContexts = [FrameContexts.authentication];
      const notAllowedContexts = getEnumElementsNotInArray(FrameContexts, allowedContexts);

      it('authentication.notifyFailure should not allow calls before initialization', () => {
        expect(() => authentication.notifyFailure()).toThrowError(new Error(errorLibraryNotInitialized));
      });

      allowedContexts.forEach((context) => {
        it(`authentication.notifyFailure should successfully notify auth failure ${context} context`, async () => {
          expect.assertions(2);
          await utils.initializeWithContext('authentication');

          authentication.notifyFailure(errorMessage);

          const message = utils.findMessageByActionName('authentication.authenticate.failure');
          expect(message.args?.length).toBe(1);
          expect(message.args?.[0]).toBe(errorMessage);
        });

        it(`authentication.notifyFailure should successfully notify auth failure if reason is empty from ${context} context`, async () => {
          expect.assertions(2);
          await utils.initializeWithContext(context);

          authentication.notifyFailure('');
          const message = utils.findMessageByActionName('authentication.authenticate.failure');
          expect(message.args?.length).toBe(1);
          expect(message.args?.[0]).toBe('');
        });
      });

      notAllowedContexts.forEach((context) => {
        it(`authentication.notifyFailure should not allow calls from ${context} context`, async () => {
          await utils.initializeWithContext(context);
          expect(authentication.notifyFailure).toThrowError(
            `This call is only allowed in following contexts: ${JSON.stringify(
              allowedContexts,
            )}. Current context: "${context}".`,
          );
        });
      });
    });
  });

  describe('FRAMELESS - authentication tests', () => {
    let utils: Utils = new Utils();
    beforeEach(() => {
      utils = new Utils();
      utils.mockWindow.parent = undefined;
      utils.messages = [];
    });
    afterEach(() => {
      app._uninitialize();
      GlobalVars.isFramelessWindow = false;
    });

    describe('Testing authentication.authenticate function', () => {
      it('authentication.authenticate should not allow calls before initialization', () => {
        const authenticationParams: authentication.AuthenticatePopUpParameters = {
          url: 'https://someurl/',
          width: 100,
          height: 200,
        };
        expect(() => authentication.authenticate(authenticationParams)).toThrowError(errorLibraryNotInitialized);
      });

      allowedContexts.forEach((context) => {
        it(`authentication.authenticate should allow calls from ${context} context`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(context);

          const authenticationParams: authentication.AuthenticatePopUpParameters = {
            url: 'https://someurl/',
            width: 100,
            height: 200,
          };
          const promise = authentication.authenticate(authenticationParams);
          const message = utils.findMessageByActionName('authentication.authenticate');
          await utils.respondToMessage(message, true, mockResult);
          await expect(promise).resolves.toEqual(mockResult);
        });

        allowedHostClientTypes.forEach((hostClientType) => {
          it(`authentication.authenticate should successfully send authenticate message to ${hostClientType} client in legacy flow from ${context} context`, async () => {
            expect.assertions(5);
            await utils.initializeWithContext(context, hostClientType);
            const authenticationParams = {
              url: 'https://someUrl',
              width: 100,
              height: 200,
              isExternal: true,
            };

            authentication.authenticate(authenticationParams);
            const message = utils.findMessageByActionName('authentication.authenticate');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toBe(authenticationParams.url.toLowerCase() + '/');
            expect(message.args?.[1]).toBe(authenticationParams.width);
            expect(message.args?.[2]).toBe(authenticationParams.height);
            expect(message.args?.[3]).toBe(authenticationParams.isExternal);
          });

          it(`authentication.authenticate it should successfully handle auth success in a ${hostClientType} client in legacy flow from ${context} context`, (done) => {
            expect.assertions(1);
            utils.initializeWithContext(context, hostClientType).then(async () => {
              const authenticationParams = {
                url: 'https://someUrl',
                width: 100,
                height: 200,
                successCallback: (result: string) => {
                  expect(result).toEqual(mockResult);
                  done();
                },
                failureCallback: () => {
                  expect(true).toBe(false);
                  done();
                },
              };
              authentication.authenticate(authenticationParams);

              const message = utils.findMessageByActionName('authentication.authenticate');
              utils.respondToFramelessMessage({
                data: {
                  id: message!.id,
                  args: [true, mockResult],
                },
              } as DOMMessageEvent);
            });
          });

          it(`authentication.authenticate should successfully ask parent window to open auth window with parameters including encoded url in ${hostClientType} client from ${context} context`, async () => {
            expect.assertions(6);
            await utils.initializeWithContext(context, hostClientType);

            jest.spyOn(internalUtils, 'fullyQualifyUrlString').mockImplementationOnce((urlString): URL => {
              return new URL('https://localhost/' + urlString);
            });

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: 'hello%20world',
              width: 100,
              height: 200,
              isExternal: true,
            };
            const promise = authentication.authenticate(authenticationParams);

            const message = utils.findMessageByActionName('authentication.authenticate');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toBe('https://localhost/hello%20world');
            expect(message.args?.[1]).toBe(authenticationParams.width);
            expect(message.args?.[2]).toBe(authenticationParams.height);
            expect(message.args?.[3]).toBe(authenticationParams.isExternal);

            utils.respondToFramelessMessage({
              data: {
                id: message.id,
                args: [true, mockResult],
              },
            } as DOMMessageEvent);
            await expect(promise).resolves.toEqual(mockResult);
          });

          it(`authentication.authenticate should throw an error in ${hostClientType} client if a URL that isn't https is passed in from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: 'http://someurl/',
              width: 100,
              height: 200,
            };

            await expect(authentication.authenticate(authenticationParams)).rejects.toThrowError(
              'Url should be a valid https url',
            );
          });

          it(`authentication.authenticate should throw an error in ${hostClientType} client if a URL that is more than 2048 characters long is passed in from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);

            let testUrl: string = 'https://';
            for (let i: number = 0; i < 2040; i++) {
              testUrl += 'a';
            }

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: testUrl,
              width: 100,
              height: 200,
            };

            await expect(authentication.authenticate(authenticationParams)).rejects.toThrowError(
              'Url exceeds the maximum size of 2048 characters',
            );
          });

          it(`authentication.authenticate should not contain script tags in ${hostClientType} client from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: encodeURI('https://example.com?param=<script>alert("Hello, world!");</script>'),
              width: 100,
              height: 200,
            };

            await expect(authentication.authenticate(authenticationParams)).rejects.toThrowError('Invalid Url');
          });

          it(`authentication.authenticate it should successfully handle auth success in a ${hostClientType} client in legacy flow from ${context} context`, (done) => {
            expect.assertions(1);
            utils.initializeWithContext(context, hostClientType).then(async () => {
              const authenticationParams = {
                url: 'https://someUrl',
                width: 100,
                height: 200,
                successCallback: (result: string) => {
                  expect(result).toEqual(mockResult);
                  done();
                },
                failureCallback: () => {
                  expect(true).toBe(false);
                  done();
                },
              };
              authentication.authenticate(authenticationParams);

              const message = utils.findMessageByActionName('authentication.authenticate');

              utils.respondToFramelessMessage({
                data: {
                  id: message.id,
                  func: 'authentication.authenticate',
                  args: [true, mockResult],
                },
              } as DOMMessageEvent);
            });
          });

          it(`authentication.authenticate should successfully ask parent window to open auth window with parameters including encoded url in ${hostClientType} client from ${context} context`, async () => {
            expect.assertions(6);
            await utils.initializeWithContext(context, hostClientType);

            jest.spyOn(internalUtils, 'fullyQualifyUrlString').mockImplementationOnce((urlString): URL => {
              return new URL('https://localhost/' + urlString);
            });

            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: 'hello%20world',
              width: 100,
              height: 200,
              isExternal: true,
            };
            const promise = authentication.authenticate(authenticationParams);

            const message = utils.findMessageByActionName('authentication.authenticate');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toBe('https://localhost/hello%20world');
            expect(message.args?.[1]).toBe(authenticationParams.width);
            expect(message.args?.[2]).toBe(authenticationParams.height);
            expect(message.args?.[3]).toBe(authenticationParams.isExternal);

            utils.respondToFramelessMessage({
              data: {
                id: message!.id,
                func: 'authentication.authenticate',
                args: [true, mockResult],
              },
            } as DOMMessageEvent);
            await expect(promise).resolves.toEqual(mockResult);
          });

          it(`authentication.authenticate should handle auth failure with parameters in ${hostClientType} client from ${context} context`, async () => {
            expect.assertions(1);
            await utils.initializeWithContext(context, hostClientType);
            const authenticationParams: authentication.AuthenticatePopUpParameters = {
              url: 'https://someurl',
              width: 100,
              height: 200,
              isExternal: true,
            };
            const promise = authentication.authenticate(authenticationParams);

            const message = utils.findMessageByActionName('authentication.authenticate');
            utils.respondToFramelessMessage({
              data: {
                id: message.id,
                func: 'authentication.authenticate.failure',
                args: [false, errorMessage],
              },
            } as DOMMessageEvent);

            await expect(promise).rejects.toThrowError(errorMessage);
          });
        });
      });

      notAllowedContexts.forEach((context) => {
        it(`authentication.authenticate should not allow calls from ${context} context`, async () => {
          expect.assertions(1);
          await utils.initializeWithContext(context);
          const authenticationParams: authentication.AuthenticatePopUpParameters = {
            url: 'https://localhost/hello%20world',
            width: 100,
            height: 200,
          };

          expect(() => authentication.authenticate(authenticationParams)).toThrowError(
            `This call is only allowed in following contexts: ${JSON.stringify(
              allowedContexts,
            )}. Current context: "${context}".`,
          );
        });
      });
    });

    describe('Testing authentication.registerAuthenticationHandlers function', () => {
      allowedContexts.forEach((context) => {
        allowedHostClientTypes.forEach((hostClientType) => {
          it(`authentication.registerAuthenticationHandlers should successfully ask parent window to open auth window with parameters in the ${hostClientType} client from ${context} context in legacy flow`, (done) => {
            expect.assertions(6);
            utils.initializeWithContext(context, hostClientType).then(async () => {
              const authenticationParams: authentication.AuthenticateParameters = {
                url: 'https://someurl',
                width: 100,
                height: 200,
                isExternal: true,
                successCallback: (result: string) => {
                  expect(result).toEqual(mockResult);
                  done();
                },
                failureCallback: () => {
                  done();
                },
              };
              authentication.registerAuthenticationHandlers(authenticationParams);
              authentication.authenticate();

              const message = utils.findMessageByActionName('authentication.authenticate');
              expect(message.args?.length).toBe(4);
              expect(message.args?.[0]).toBe(authenticationParams.url.toLowerCase() + '/');
              expect(message.args?.[1]).toBe(authenticationParams.width);
              expect(message.args?.[2]).toBe(authenticationParams.height);
              expect(message.args?.[3]).toBe(authenticationParams.isExternal);

              utils.respondToFramelessMessage({
                data: {
                  id: message.id,
                  args: [true, mockResult],
                },
              } as DOMMessageEvent);
            });
          });

          it(`authentication.registerAuthenticationHandlers should handle auth failure with parameters in the ${hostClientType} client from ${context} context in legacy flow`, (done) => {
            expect.assertions(1);
            utils.initializeWithContext(context, hostClientType).then(async () => {
              const authenticationParams: authentication.AuthenticateParameters = {
                url: 'https://someurl',
                width: 100,
                height: 200,
                isExternal: true,
                successCallback: () => {
                  done();
                },
                failureCallback: (reason: string) => {
                  expect(reason).toEqual(errorMessage);
                  done();
                },
              };
              authentication.registerAuthenticationHandlers(authenticationParams);
              authentication.authenticate();

              const message = utils.findMessageByActionName('authentication.authenticate');
              utils.respondToFramelessMessage({
                data: {
                  id: message.id,
                  args: [false, errorMessage],
                },
              } as DOMMessageEvent);
            });
          });
        });
      });
    });

    describe('Testing authentication.getAuthToken function', () => {
      it('authentication.getAuthToken should not allow calls before initialization', () => {
        const authTokenRequest = {
          resources: [mockResource],
          claims: [mockClaim],
          silent: false,
        };

        expect(() => authentication.getAuthToken(authTokenRequest)).toThrowError(new Error(errorLibraryNotInitialized));
      });

      Object.values(FrameContexts).forEach((context) => {
        it(`authentication.getAuthToken should successfully return token in case of success in legacy flow from ${context} context`, (done) => {
          expect.assertions(5);
          utils.initializeWithContext(context).then(async () => {
            const authTokenRequest = {
              resources: [mockResource],
              claims: [mockClaim],
              silent: false,
              failureCallback: () => {
                done();
              },
              successCallback: (result) => {
                expect(result).toEqual('token');
                done();
              },
            };

            authentication.getAuthToken(authTokenRequest);

            const message = utils.findMessageByActionName('authentication.getAuthToken');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toEqual([mockResource]);
            expect(message.args?.[1]).toEqual([mockClaim]);
            expect(message.args?.[2]).toEqual(false);

            utils.respondToFramelessMessage({
              data: {
                id: message.id,
                args: [true, 'token'],
              },
            } as DOMMessageEvent);
          });
        });

        it(`authentication.getAuthToken should throw error in case of failure in legacy flow from ${context} context`, (done) => {
          expect.assertions(5);
          utils.initializeWithContext(context).then(async () => {
            const authTokenRequest = {
              resources: [mockResource],
              failureCallback: (error) => {
                expect(error).toEqual(errorMessage);
                done();
              },
              successCallback: () => {
                done();
              },
            };

            authentication.getAuthToken(authTokenRequest);

            const message = utils.findMessageByActionName('authentication.getAuthToken');
            expect(message.args?.length).toBe(4);
            expect(message.args?.[0]).toEqual([mockResource]);
            expect(message.args?.[1]).toBeNull();
            expect(message.args?.[2]).toBeNull();
            utils.respondToFramelessMessage({
              data: {
                id: message.id,
                args: [false, errorMessage],
              },
            } as DOMMessageEvent);
          });
        });

        it(`authentication.getAuthToken should successfully return token in case of success from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const authTokenRequest = {
            resources: [mockResource],
            claims: [mockClaim],
            silent: false,
          };

          const promise = authentication.getAuthToken(authTokenRequest);

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toEqual([mockResource]);
          expect(message.args?.[1]).toEqual([mockClaim]);
          expect(message.args?.[2]).toEqual(false);
          utils.respondToFramelessMessage({
            data: {
              id: message.id,
              args: [true, 'token'],
            },
          } as DOMMessageEvent);
          await expect(promise).resolves.toEqual('token');
        });

        it(`authentication.getAuthToken should successfully return token in case of success when using no authTokenRequest from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const promise = authentication.getAuthToken();

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toBeNull();
          expect(message.args?.[1]).toBeNull();
          expect(message.args?.[2]).toBeNull();

          utils.respondToFramelessMessage({
            data: {
              id: message.id,
              args: [true, 'token'],
            },
          } as DOMMessageEvent);
          await expect(promise).resolves.toEqual('token');
        });

        it(`authentication.getAuthToken should throw error in case of failure from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const authTokenRequest: authentication.AuthTokenRequestParameters = {
            resources: [mockResource],
          };

          const promise = authentication.getAuthToken(authTokenRequest);

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toEqual([mockResource]);
          expect(message.args?.[1]).toBeNull();
          expect(message.args?.[2]).toBeNull();
          utils.respondToFramelessMessage({
            data: {
              id: message.id,
              args: [false, errorMessage],
            },
          } as DOMMessageEvent);
          await expect(promise).rejects.toThrowError(errorMessage);
        });

        it(`authentication.getAuthToken should throw error in case of failure when using no authTokenRequest from ${context} context`, async () => {
          expect.assertions(5);
          await utils.initializeWithContext(context);

          const promise = authentication.getAuthToken();

          const message = utils.findMessageByActionName('authentication.getAuthToken');
          expect(message.args?.length).toBe(4);
          expect(message.args?.[0]).toBeNull();
          expect(message.args?.[1]).toBeNull();
          expect(message.args?.[2]).toBeNull();

          utils.respondToFramelessMessage({
            data: {
              id: message!.id,
              args: [false, errorMessage],
            },
          } as DOMMessageEvent);
          await expect(promise).rejects.toThrowError(errorMessage);
        });
      });
    });

    describe('Testing authentication.getUser function', () => {
      it('authentication.getUser should not allow calls before initialization', () => {
        expect(() => authentication.getUser()).toThrowError(new Error(errorLibraryNotInitialized));
      });

      Object.values(FrameContexts).forEach((context) => {
        it(`authentication.getUser should successfully get user profile in legacy flow with ${context} context`, (done) => {
          expect.assertions(3);
          utils.initializeWithContext(context).then(async () => {
            const successCallback = (user: authentication.UserProfile): void => {
              expect(user).toEqual(mockResult);
              done();
            };
            const failureCallback = (): void => {
              done();
            };
            const userRequest: authentication.UserRequest = {
              successCallback: successCallback,
              failureCallback: failureCallback,
            };
            authentication.getUser(userRequest);
            const message = utils.findMessageByActionName('authentication.getUser');
            expect(message.id).toBe(1);
            expect(message.args?.[0]).toBe(undefined);
            utils.respondToFramelessMessage({
              data: {
                id: message.id,
                args: [true, mockResult],
              },
            } as DOMMessageEvent);
          });
        });

        it(`authentication.getUser should throw error in getting user profile in legacy flow with ${context} context`, (done) => {
          expect.assertions(3);
          utils.initializeWithContext(context).then(async () => {
            const successCallback = (): void => {
              done();
            };
            const failureCallback = (reason: string): void => {
              expect(reason).toMatch(new RegExp(sdkError.message!));
              done();
            };
            const userRequest: authentication.UserRequest = {
              successCallback: successCallback,
              failureCallback: failureCallback,
            };
            authentication.getUser(userRequest);
            const message = utils.findMessageByActionName('authentication.getUser');
            expect(message.id).toBe(1);
            expect(message.args?.[0]).toBe(undefined);
            utils.respondToFramelessMessage({
              data: {
                id: message.id,
                args: [false, sdkError],
              },
            } as DOMMessageEvent);
          });
        });

        it(`authentication.getUser should throw error in getting user profile with ${context} context`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(context);
          const promise = authentication.getUser();
          const message = utils.findMessageByActionName('authentication.getUser');
          expect(message.id).toBe(1);
          expect(message.args?.[0]).toBe(undefined);
          utils.respondToFramelessMessage({
            data: {
              id: message.id,
              args: [false, sdkError],
            },
          } as DOMMessageEvent);
          await expect(promise).rejects.toThrowError(new RegExp(errorMessage));
        });

        it(`authentication.getUser should successfully get user profile with ${context} context`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(context);
          const promise = authentication.getUser();
          const message = utils.findMessageByActionName('authentication.getUser');
          expect(message.id).toBe(1);
          expect(message.args?.[0]).toBe(undefined);
          utils.respondToFramelessMessage({
            data: {
              id: message.id,
              args: [true, mockUser],
            },
          } as DOMMessageEvent);
          await expect(promise).resolves.toEqual(mockUser);
        });

        it(`authentication.getUser should successfully get user profile including data residency info with ${context} context if data residency is provided by hosts`, async () => {
          expect.assertions(3);
          await utils.initializeWithContext(context);
          const promise = authentication.getUser();
          const message = utils.findMessageByActionName('authentication.getUser');
          expect(message.id).toBe(1);
          expect(message.args?.[0]).toBe(undefined);
          utils.respondToFramelessMessage({
            data: {
              id: message.id,
              args: [true, mockUserWithDataResidency],
            },
          } as DOMMessageEvent);
          await expect(promise).resolves.toEqual(mockUserWithDataResidency);
        });
      });
    });

    describe('Testing authentication.notifySuccess function', () => {
      const allowedContexts = [FrameContexts.authentication];

      it('authentication.notifySuccess should not allow calls before initialization', () => {
        expect(() => authentication.notifySuccess()).toThrowError(new Error(errorLibraryNotInitialized));
      });

      Object.values(FrameContexts).forEach((context) => {
        if (!allowedContexts.some((allowedContexts) => allowedContexts === context)) {
          it(`authentication.notifySuccess should not allow calls from ${context} context`, async () => {
            await utils.initializeWithContext(context);
            expect(() => authentication.notifySuccess()).toThrow(
              `This call is only allowed in following contexts: ${JSON.stringify(
                allowedContexts,
              )}. Current context: "${context}".`,
            );
          });
        } else {
          it(`authentication.notifySuccess should successfully notify auth success from ${context} context`, async () => {
            expect.assertions(2);
            await utils.initializeWithContext(context, HostClientType.android);

            authentication.notifySuccess(mockResult);
            const message = utils.findMessageByActionName('authentication.authenticate.success');
            expect(message.args?.length).toBe(1);
            expect(message.args?.[0]).toBe(mockResult);
          });
        }
      });
    });

    describe('Testing authentication.notifyFailure', () => {
      const allowedContexts = [FrameContexts.authentication];
      it('authentication.notifyFailure should not allow calls before initialization', () => {
        expect(() => authentication.notifyFailure()).toThrowError(new Error(errorLibraryNotInitialized));
      });

      Object.values(FrameContexts).forEach((context) => {
        if (!allowedContexts.some((allowedContexts) => allowedContexts === context)) {
          it(`authentication.notifyFailure should not allow calls from ${context} context`, async () => {
            await utils.initializeWithContext(context);
            expect(() => authentication.notifyFailure()).toThrow(
              `This call is only allowed in following contexts: ${JSON.stringify(
                allowedContexts,
              )}. Current context: "${context}".`,
            );
          });
        } else {
          it(`authentication.notifyFailure should successfully notify auth failure from ${context} context`, async () => {
            expect.assertions(2);
            await utils.initializeWithContext(context, HostClientType.android);

            authentication.notifyFailure(mockResult);
            const message = utils.findMessageByActionName('authentication.authenticate.failure');
            expect(message.args?.length).toBe(1);
            expect(message.args?.[0]).toBe(mockResult);
          });
        }
      });
    });
  });
});
