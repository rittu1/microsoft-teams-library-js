/**
 * @hidden
 * Module to delegate authentication requests to the host for custom engine agents
 * @internal
 * Limited to Microsoft-internal use
 * @beta
 * @module
 */
import { callFunctionInHost, callFunctionInHostAndHandleResponse } from '../internal/communication';
import { validateAppIdInstance } from '../internal/idValidation';
import { ensureInitialized } from '../internal/internalAPIs';
import { ApiName, ApiVersionNumber, getApiVersionTag } from '../internal/telemetry';
import { validateId } from '../internal/utils';
import { AppId } from '../public';
import { errorNotSupportedOnPlatform, FrameContexts } from '../public/constants';
import { runtime } from '../public/runtime';
import * as externalAppAuthentication from './externalAppAuthentication';

const externalAppAuthenticationTelemetryVersionNumber: ApiVersionNumber = ApiVersionNumber.V_2;

/**
 * @beta
 * @hidden
 * Signals to the host to perform SSO authentication for the application specified by the app ID, and then send the authResult to the application backend.
 * @internal
 * Limited to Microsoft-internal use
 * @param appId App ID of the app upon whose behalf Copilot is requesting authentication. This must be a UUID.
 * @param conversationId ConversationId To tell the bot what conversation the calls are coming from
 * @param authTokenRequest Parameters for SSO authentication
 * @throws InvokeError if the host encounters an error while authenticating
 * @returns A promise that resolves when authentication succeeds and rejects with InvokeError on failure
 */
export async function authenticateWithSSO(
  appId: AppId,
  conversationId: string,
  authTokenRequest: AuthTokenRequestParametersForCEA,
): Promise<void> {
  ensureInitialized(runtime, FrameContexts.content);

  if (!isSupported()) {
    throw errorNotSupportedOnPlatform;
  }

  validateInput(appId, conversationId);

  return callFunctionInHost(
    ApiName.ExternalAppAuthenticationForCEA_AuthenticateWithSSO,
    [
      appId,
      conversationId,
      authTokenRequest.authId,
      authTokenRequest.connectionName,
      authTokenRequest.claims,
      authTokenRequest.silent,
    ],
    getApiVersionTag(
      externalAppAuthenticationTelemetryVersionNumber,
      ApiName.ExternalAppAuthenticationForCEA_AuthenticateWithSSO,
    ),
    externalAppAuthentication.isInvokeError,
  );
}

/**
 * @beta
 * @hidden
 * Signals to the host to perform authentication using the given authentication parameters and then send the auth result to the application backend.
 * @internal
 * Limited to Microsoft-internal use
 * @param appId App ID of the app upon whose behalf Copilot is requesting authentication. This must be a UUID.
 * @param conversationId ConversationId To tell the bot what conversation the calls are coming from
 * @param authenticateParameters Parameters for the authentication pop-up
 * @throws InvokeError if the host encounters an error while authenticating
 * @returns A promise that resolves from the application backend and rejects with InvokeError if the host encounters an error while authenticating
 */
export async function authenticateWithOauth(
  appId: AppId,
  conversationId: string,
  authenticateParameters: externalAppAuthentication.AuthenticatePopUpParameters,
): Promise<void> {
  ensureInitialized(runtime, FrameContexts.content);

  if (!isSupported()) {
    throw errorNotSupportedOnPlatform;
  }

  validateInput(appId, conversationId);

  // Ask the parent window to open an authentication window with the parameters provided by the caller.
  return callFunctionInHost(
    ApiName.ExternalAppAuthenticationForCEA_AuthenticateWithOauth,
    [
      appId,
      conversationId,
      authenticateParameters.url.href,
      authenticateParameters.width,
      authenticateParameters.height,
      authenticateParameters.isExternal,
    ],
    getApiVersionTag(
      externalAppAuthenticationTelemetryVersionNumber,
      ApiName.ExternalAppAuthenticationForCEA_AuthenticateWithOauth,
    ),
    externalAppAuthentication.isInvokeError,
  );
}

/**
 * @beta
 * @hidden
 * Signals to the host to perform authentication using the given authentication parameters and then resend the request to the application backend with the authentication result.
 * @internal
 * Limited to Microsoft-internal use
 * @param appId App ID of the app upon whose behalf Copilot is requesting authentication. This must be a UUID.
 * @param conversationId ConversationId To tell the bot what conversation the calls are coming from
 * @param authenticateParameters Parameters for the authentication pop-up
 * @param originalRequestInfo Information about the original request that should be resent
 * @throws InvokeError if the host encounters an error while authenticating or resending the request
 * @returns A promise that resolves to the IActionExecuteResponse from the application backend and rejects with InvokeError if the host encounters an error while authenticating or resending the request
 */
export async function authenticateAndResendRequest(
  appId: AppId,
  conversationId: string,
  authenticateParameters: externalAppAuthentication.AuthenticatePopUpParameters,
  originalRequestInfo: externalAppAuthentication.IActionExecuteInvokeRequest,
): Promise<externalAppAuthentication.IActionExecuteResponse> {
  ensureInitialized(runtime, FrameContexts.content);

  if (!isSupported()) {
    throw errorNotSupportedOnPlatform;
  }

  validateInput(appId, conversationId);

  externalAppAuthentication.validateActionExecuteInvokeRequest(originalRequestInfo);

  // Ask the parent window to open an authentication window with the parameters provided by the caller.
  return callFunctionInHostAndHandleResponse<
    externalAppAuthentication.IActionExecuteResponse,
    externalAppAuthentication.IActionExecuteResponse
  >(
    ApiName.ExternalAppAuthenticationForCEA_AuthenticateAndResendRequest,
    [
      appId,
      conversationId,
      new externalAppAuthentication.SerializableActionExecuteInvokeRequest(originalRequestInfo),
      authenticateParameters.url.href,
      authenticateParameters.width,
      authenticateParameters.height,
      authenticateParameters.isExternal,
    ],
    new externalAppAuthentication.ActionExecuteResponseHandler(),
    getApiVersionTag(
      externalAppAuthenticationTelemetryVersionNumber,
      ApiName.ExternalAppAuthenticationForCEA_AuthenticateAndResendRequest,
    ),
    externalAppAuthentication.isInvokeError,
  );
}

/**
 * @hidden
 * Parameters for SSO authentication. This interface is used exclusively with the externalAppAuthentication APIs
 * @internal
 * Limited to Microsoft-internal use
 */
export type AuthTokenRequestParametersForCEA = externalAppAuthentication.AuthTokenRequestParameters & {
  /**
   * Id to complete the request
   */
  authId: string;

  /**
   * Connection name to complete the request
   */
  connectionName: string;
};

/**
 * @beta
 * @hidden
 * Signals to the host to perform SSO authentication for the application specified by the app ID and then resend the request to the application backend with the authentication result and originalRequestInfo
 * @internal
 * Limited to Microsoft-internal use
 * @param appId App ID of the app upon whose behalf Copilot is requesting authentication. This must be a UUID.
 * @param conversationId ConversationId To tell the bot what conversation the calls are coming from
 * @param authTokenRequest Parameters for SSO authentication
 * @param originalRequestInfo Information about the original request that should be resent
 * @throws InvokeError if the host encounters an error while authenticating or resending the request
 * @returns A promise that resolves to the IActionExecuteResponse from the application backend and rejects with InvokeError if the host encounters an error while authenticating or resending the request
 */
export async function authenticateWithSSOAndResendRequest(
  appId: AppId,
  conversationId: string,
  authTokenRequest: AuthTokenRequestParametersForCEA,
  originalRequestInfo: externalAppAuthentication.IActionExecuteInvokeRequest,
): Promise<externalAppAuthentication.IActionExecuteResponse> {
  ensureInitialized(runtime, FrameContexts.content);

  if (!isSupported()) {
    throw errorNotSupportedOnPlatform;
  }

  validateInput(appId, conversationId);

  externalAppAuthentication.validateActionExecuteInvokeRequest(originalRequestInfo);

  return callFunctionInHostAndHandleResponse<
    externalAppAuthentication.IActionExecuteResponse,
    externalAppAuthentication.IActionExecuteResponse
  >(
    ApiName.ExternalAppAuthenticationForCEA_AuthenticateWithSSOAndResendRequest,
    [
      appId,
      conversationId,
      new externalAppAuthentication.SerializableActionExecuteInvokeRequest(originalRequestInfo),
      authTokenRequest.authId,
      authTokenRequest.connectionName,
      authTokenRequest.claims,
      authTokenRequest.silent,
    ],
    new externalAppAuthentication.ActionExecuteResponseHandler(),
    getApiVersionTag(
      externalAppAuthenticationTelemetryVersionNumber,
      ApiName.ExternalAppAuthenticationForCEA_AuthenticateWithSSOAndResendRequest,
    ),
    externalAppAuthentication.isInvokeError,
  );
}

/**
 * @beta
 * @hidden
 * Checks if the externalAppAuthenticationForCEA capability is supported by the host
 * @returns boolean to represent whether externalAppAuthenticationForCEA capability is supported
 * @throws Error if {@linkcode app.initialize} has not successfully completed
 * @internal
 * Limited to Microsoft-internal use
 */
export function isSupported(): boolean {
  return ensureInitialized(runtime) && runtime.supports.externalAppAuthenticationForCEA ? true : false;
}

/**
 * @hidden
 * Checks if the input is valid
 * @param appId App ID of the app upon whose behalf Copilot is requesting authentication. This must be a UUID.
 * @param conversationId ConversationId To tell the bot what conversation the calls are coming from

 * @throws Error if {@linkcode app.initialize} has not successfully completed
 * @internal
 * Limited to Microsoft-internal use
 */
export function validateInput(appId: AppId, conversationId: string): void {
  validateId(conversationId, new Error('conversation id is not valid.'));
  validateAppIdInstance(appId);
}
