//
//  DeviceAuth.swift
//  Zingo
//

import Foundation
import LocalAuthentication
import React

/// The device-auth call behind the app's privacy shutter (ADR 0007): one
/// LocalAuthentication ceremony per invocation, resolved as a typed
/// outcome. The promise always resolves; `declined` covers the endings
/// the person chose (cancel, failed attempts), `unavailable` everything
/// the platform refused, and `code` is the LAError raw value for bug
/// reports.
@objc(DeviceAuth)
class DeviceAuth: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private func outcome(_ outcome: String, _ code: String) -> [String: Any] {
    return ["outcome": outcome, "code": code]
  }

  @objc(canAuthenticate:reject:)
  func canAuthenticate(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let context = LAContext()
    var error: NSError?
    let available = context.canEvaluatePolicy(
      .deviceOwnerAuthentication, error: &error)
    resolve([
      "available": available,
      "code": error.map { String($0.code) } ?? "",
    ])
  }

  @objc(authenticate:cancel:resolve:reject:)
  func authenticate(
    _ title: String,
    cancel: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let context = LAContext()
    context.localizedCancelTitle = cancel
    context.evaluatePolicy(
      .deviceOwnerAuthentication, localizedReason: title
    ) { success, error in
      if success {
        resolve(self.outcome("authenticated", ""))
        return
      }
      let code = (error as NSError?)?.code ?? 0
      let declined =
        code == LAError.userCancel.rawValue
        || code == LAError.authenticationFailed.rawValue
      resolve(
        self.outcome(declined ? "declined" : "unavailable", String(code)))
    }
  }
}
