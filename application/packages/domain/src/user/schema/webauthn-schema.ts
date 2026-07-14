// WebAuthn の JSON 表現に準拠した中立型。特定の認証プロバイダ SDK やブラウザライブラリの宣言に依存しないよう domain が独自に保持する
// @see https://w3c.github.io/webauthn/#dictdef-publickeycredentialcreationoptionsjson

type Base64UrlString = string

type PublicKeyCredentialTypeJson = 'public-key'

type AuthenticatorTransportJson =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb'

type AuthenticatorAttachmentJson = 'cross-platform' | 'platform'

type ResidentKeyRequirementJson = 'discouraged' | 'preferred' | 'required'

type UserVerificationRequirementJson = 'discouraged' | 'preferred' | 'required'

type AttestationConveyancePreferenceJson = 'direct' | 'enterprise' | 'indirect' | 'none'

type AttestationFormatJson =
  | 'fido-u2f'
  | 'packed'
  | 'android-safetynet'
  | 'android-key'
  | 'tpm'
  | 'apple'
  | 'none'

type PublicKeyCredentialHintJson = 'hybrid' | 'security-key' | 'client-device'

interface PublicKeyCredentialRpEntityJson {
  id?: string
  name: string
}

interface PublicKeyCredentialUserEntityJson {
  id: Base64UrlString
  name: string
  displayName: string
}

interface PublicKeyCredentialParametersJson {
  alg: number
  type: PublicKeyCredentialTypeJson
}

interface PublicKeyCredentialDescriptorJson {
  id: Base64UrlString
  type: PublicKeyCredentialTypeJson
  transports?: AuthenticatorTransportJson[]
}

interface AuthenticatorSelectionCriteriaJson {
  authenticatorAttachment?: AuthenticatorAttachmentJson
  requireResidentKey?: boolean
  residentKey?: ResidentKeyRequirementJson
  userVerification?: UserVerificationRequirementJson
}

interface AuthenticationExtensionsClientInputsJson {
  appid?: string
  credProps?: boolean
  hmacCreateSecret?: boolean
  minPinLength?: boolean
}

interface AuthenticationExtensionsClientOutputsJson {
  appid?: boolean
  credProps?: { rk?: boolean }
  hmacCreateSecret?: boolean
}

/**
 * navigator.credentials.create() へ渡す資格情報生成オプション（JSON 形式）
 */
export interface WebAuthnRegistrationOptions {
  rp: PublicKeyCredentialRpEntityJson
  user: PublicKeyCredentialUserEntityJson
  challenge: Base64UrlString
  pubKeyCredParams: PublicKeyCredentialParametersJson[]
  timeout?: number
  excludeCredentials?: PublicKeyCredentialDescriptorJson[]
  authenticatorSelection?: AuthenticatorSelectionCriteriaJson
  hints?: PublicKeyCredentialHintJson[]
  attestation?: AttestationConveyancePreferenceJson
  attestationFormats?: AttestationFormatJson[]
  extensions?: AuthenticationExtensionsClientInputsJson
}

/**
 * navigator.credentials.get() へ渡す資格情報リクエストオプション（JSON 形式）
 */
export interface WebAuthnAuthenticationOptions {
  challenge: Base64UrlString
  timeout?: number
  rpId?: string
  allowCredentials?: PublicKeyCredentialDescriptorJson[]
  userVerification?: UserVerificationRequirementJson
  hints?: PublicKeyCredentialHintJson[]
  extensions?: AuthenticationExtensionsClientInputsJson
}

interface AuthenticatorAttestationResponseJson {
  clientDataJSON: Base64UrlString
  attestationObject: Base64UrlString
  authenticatorData?: Base64UrlString
  transports?: AuthenticatorTransportJson[]
  publicKeyAlgorithm?: number
  publicKey?: Base64UrlString
}

interface AuthenticatorAssertionResponseJson {
  clientDataJSON: Base64UrlString
  authenticatorData: Base64UrlString
  signature: Base64UrlString
  userHandle?: Base64UrlString
}

/**
 * navigator.credentials.create() の結果を JSON 化した登録用資格情報
 */
export interface WebAuthnRegistrationCredential {
  id: Base64UrlString
  rawId: Base64UrlString
  response: AuthenticatorAttestationResponseJson
  authenticatorAttachment?: AuthenticatorAttachmentJson
  clientExtensionResults: AuthenticationExtensionsClientOutputsJson
  type: PublicKeyCredentialTypeJson
}

/**
 * navigator.credentials.get() の結果を JSON 化した認証用資格情報
 */
export interface WebAuthnAuthenticationCredential {
  id: Base64UrlString
  rawId: Base64UrlString
  response: AuthenticatorAssertionResponseJson
  authenticatorAttachment?: AuthenticatorAttachmentJson
  clientExtensionResults: AuthenticationExtensionsClientOutputsJson
  type: PublicKeyCredentialTypeJson
}

/**
 * verify で受け取る資格情報。登録／認証のどちらの ceremony 結果も同一エンドポイント経路で素通しするため両者の union で表す
 */
export type WebAuthnCredential = WebAuthnRegistrationCredential | WebAuthnAuthenticationCredential
