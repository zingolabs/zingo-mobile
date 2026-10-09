//
//  PrivacyGuard.swift
//  Zingo
//

import Foundation
import React
import UIKit

/// Reports screenshots and screen capture, and copies text to an expiring, device-only pasteboard item.
@objc(PrivacyGuard)
class PrivacyGuard: RCTEventEmitter {
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["screenshot", "captured"]
  }

  override func startObserving() {
    let center = NotificationCenter.default
    center.addObserver(
      self, selector: #selector(screenshotTaken),
      name: UIApplication.userDidTakeScreenshotNotification, object: nil)
    center.addObserver(
      self, selector: #selector(captureChanged),
      name: UIScreen.capturedDidChangeNotification, object: nil)
  }

  override func stopObserving() {
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func screenshotTaken() {
    sendEvent(withName: "screenshot", body: nil)
  }

  @objc private func captureChanged() {
    DispatchQueue.main.async {
      self.sendEvent(withName: "captured", body: UIScreen.main.isCaptured)
    }
  }

  @objc
  func isCaptured(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      resolve(UIScreen.main.isCaptured)
    }
  }

  @objc
  func copySensitive(
    _ text: String,
    seconds: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      UIPasteboard.general.setItems(
        [["public.utf8-plain-text": text]],
        options: [
          .localOnly: true,
          .expirationDate: Date(timeIntervalSinceNow: seconds),
        ])
      resolve(true)
    }
  }
}
