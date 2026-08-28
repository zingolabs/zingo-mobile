//
//  NymTransportModule.swift
//  Zingo
//
//  The iOS half of Mixnet Mode, a mirror of the Android NymTransportModule.
//  It hosts the UniFFI proxy shim (`zingo_nym_proxy_ffi`) inside the app
//  process and offers its local SOCKS5 endpoint to the app layer, which hands
//  it to the wallet's `attach_mixnet` seam. The loopback socket, not a shared
//  compile unit, is the boundary between the two lockfile-incompatible stacks.
//
//  Lifecycle: `startMixnetTransport` (re)starts the proxy and resolves its
//  binding — the `host:port` endpoint and the Exit Node it bound, both of
//  which the wallet's attach seam requires; `stopMixnetTransport` is the
//  deliberate teardown.
//  A proxy that dies on its own is caught by the shim's liveness monitor; the
//  observer clears the stored handle so a later re-enable starts afresh, while
//  the wallet's own probe surfaces the `died` mode the app polls.
//
//  Failures settle out of band as rejections under this module's operation
//  codes (ADRs 0002 and 0003), never prose in a resolved payload.

import Foundation
import React

/// The identity decision for a proxy death report (#1227): a death may clear
/// only the handle its observer was started for. Closed so the observer must
/// render both verdicts.
enum HandleDeathVerdict {
  case clearStored
  case retainStored
}

/// Pure: the stored handle is cleared only when it is identically the one the
/// reporting observer watched. Reference identity is the contract, every start
/// stores the exact instance it created.
func verdictOnDeath(stored: MixnetProxyHandle?, watched: MixnetProxyHandle?) -> HandleDeathVerdict {
  if let stored, let watched, stored === watched {
    return .clearStored
  }
  return .retainStored
}

@objc(NymTransportModule)
class NymTransportModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // One proxy per app process, shared across React context reloads.
  private static let handleLock = NSLock()
  private static var handle: MixnetProxyHandle?

  /// Frees the stored handle and clears the slot before anything that can
  /// throw, so a failed restart never strands a stopped predecessor.
  private static func releaseHandle() {
    // stop() begins the ordered off-thread teardown at a known point, and
    // the ARC release of the last reference reaches the same idempotent
    // path through the Rust Drop.
    let stored = handle
    handle = nil
    stored?.stop()
  }

  /// The proxy-owner-remediates contract: a death report only clears the
  /// stored handle (its endpoint is dead, so it must not be stopped or
  /// reused). Recovery stays with the user-driven re-enable.
  ///
  /// Identity-checked (#1227): the observer speaks only for the handle it was
  /// started with, so a dying predecessor's late report cannot wipe a fresh
  /// replacement. `watched` is weak so the observer the Rust monitor retains
  /// never keeps the handle alive across the FFI boundary.
  private final class HandleClearingObserver: ProxyDeathObserver {
    weak var watched: MixnetProxyHandle?

    func onDeath(reason: ProxyDeathReason) {
      NSLog("[Native] mixnet proxy died: \(reason)")
      NymTransportModule.handleLock.lock()
      defer { NymTransportModule.handleLock.unlock() }
      switch verdictOnDeath(stored: NymTransportModule.handle, watched: watched) {
      case .clearStored: NymTransportModule.releaseHandle()
      case .retainStored: break
      }
    }
  }

  // Proxy start/stop bootstraps and tears down the mixnet client, which can
  // run for seconds. Offload to a background queue so it never occupies the
  // module's method queue (mirrors RPCModule's FFI dispatch); the promise
  // settles back on main.
  @objc(startMixnetTransport:reject:)
  func startMixnetTransport(_ resolve: @escaping RCTPromiseResolveBlock,
                            reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      NymTransportModule.handleLock.lock()
      defer { NymTransportModule.handleLock.unlock() }
      do {
        NymTransportModule.releaseHandle()
        let observer = HandleClearingObserver()
        let started = try MixnetProxyHandle.start(observer: observer)
        observer.watched = started
        NymTransportModule.handle = started
        let endpoint = started.socks5Endpoint()
        let address = "\(endpoint.host):\(endpoint.port)"
        guard let exitNode = started.exitNode() else {
          throw NSError(domain: "start_mixnet_transport", code: 1, userInfo: [
            NSLocalizedDescriptionKey: "the started proxy reported no exit node",
          ])
        }
        DispatchQueue.main.async {
          resolve(["socks5Addr": address, "exitNode": exitNode])
        }
      } catch {
        NSLog("[Native] nym start_mixnet_transport rejected. \(error)")
        DispatchQueue.main.async { reject("start_mixnet_transport", "\(error)", error) }
      }
    }
  }

  @objc(stopMixnetTransport:reject:)
  func stopMixnetTransport(_ resolve: @escaping RCTPromiseResolveBlock,
                           reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      NymTransportModule.handleLock.lock()
      NymTransportModule.releaseHandle()
      NymTransportModule.handleLock.unlock()
      DispatchQueue.main.async { resolve(nil) }
    }
  }
}
