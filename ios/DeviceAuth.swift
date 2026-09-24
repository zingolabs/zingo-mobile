//
//  DeviceAuth.swift
//  Zingo
//

import Foundation
import LocalAuthentication
import React

/// The device-auth call behind the app's privacy shutter (ADR 0007): one
/// LocalAuthentication ceremony at a time, resolved as a typed outcome.
///
/// The module guarantees settlement: evaluatePolicy always invokes its
/// reply block, and the context that owns the evaluation is held for its
/// whole life so it cannot be invalidated out from under the prompt. A
/// concurrent call joins the live ceremony and shares its single answer,
/// matching the Android half, so the JS gate controller needs no
/// rejection path and no watchdog.
///
/// `declined` covers the endings the person chose (cancel, failed
/// attempts, leaving the app while it asked) and is also the arm an
/// unrecognised ending falls into, so a case added by a future SDK locks
/// the shutter rather than opening it. `unavailable` covers the refusals
/// the platform names, where the shutter fails open with a notice.
/// `code` is the LAError raw value for bug reports.
@objc(DeviceAuth)
class DeviceAuth: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// Guards the ceremony slot: the bridge calls in on its own queue and
  /// LocalAuthentication replies on a private one.
  private let lock = NSLock()

  /// The live evaluation's context. `LAContext.h` requires a strong
  /// reference for the whole evaluation: releasing one invalidates it and
  /// terminates the prompt with `appCancel`, which would fail the shutter
  /// open on nothing but a deallocation. The reply block captures `self`,
  /// never the context, so the property is what keeps it alive.
  private var activeContext: LAContext?

  /// Everyone waiting on the live ceremony, answered together, once.
  private var waiters: [RCTPromiseResolveBlock] = []

  private func outcome(_ outcome: String, _ code: String) -> [String: Any] {
    return ["outcome": outcome, "code": code]
  }

  /// Answers every waiter of the live ceremony and releases the slot.
  private func settle(_ name: String, _ code: String) {
    lock.lock()
    let pending = waiters
    waiters = []
    activeContext = nil
    lock.unlock()
    for resolve in pending {
      resolve(outcome(name, code))
    }
  }

  /// Maps an evaluation's error onto the outcome union. Inverted on
  /// purpose: only a refusal LocalAuthentication names reaches the
  /// fail-open arm, and everything else — including a case a future SDK
  /// adds, which `LAError.Code` being non-frozen means cannot be listed
  /// exhaustively here — locks.
  private func classify(_ error: Error?) -> (String, String) {
    guard let nsError = error as NSError? else {
      return ("declined", "")
    }
    let code = String(nsError.code)
    guard nsError.domain == LAErrorDomain,
      let reason = LAError.Code(rawValue: nsError.code)
    else {
      // Not LocalAuthentication's error at all: nobody was asked, so the
      // gate could not run.
      return ("unavailable", code)
    }
    switch reason {
    case .biometryNotAvailable, .biometryNotEnrolled, .biometryLockout,
      .passcodeNotSet, .invalidContext, .notInteractive, .appCancel:
      return ("unavailable", code)
    case .userCancel, .userFallback, .authenticationFailed, .systemCancel:
      return ("declined", code)
    default:
      return ("declined", code)
    }
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
    // `LAContext.h` makes localizedReason mandatory and raises
    // NSInvalidArgumentException on an empty one. A catalog key resolving
    // before the translations load returns "".
    if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      resolve(outcome("unavailable", "empty-title"))
      return
    }

    // A second call must never present a second prompt: it joins the live
    // ceremony and shares the answer the person is about to give.
    lock.lock()
    waiters.append(resolve)
    if activeContext != nil {
      lock.unlock()
      return
    }
    let context = LAContext()
    context.localizedCancelTitle = cancel
    activeContext = context
    lock.unlock()

    context.evaluatePolicy(
      .deviceOwnerAuthentication, localizedReason: title
      // `self` is captured strongly on purpose: the settlement guarantee
      // outranks the transient cycle (self → activeContext → evaluation →
      // this block → self), which `settle` breaks by clearing the slot.
    ) { success, error in
      if success {
        self.settle("authenticated", "")
        return
      }
      let (name, code) = self.classify(error)
      self.settle(name, code)
    }
  }
}
