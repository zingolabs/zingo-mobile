import CoreMotion
import Foundation
import React

@objc(FlipDetector)
class FlipDetector: RCTEventEmitter {
  private let motion = CMMotionManager()
  private var lastDown: Bool?

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["faceDown"]
  }

  @objc
  func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(motion.isAccelerometerAvailable)
  }

  @objc
  func start() {
    if !motion.isAccelerometerAvailable || motion.isAccelerometerActive {
      return
    }
    motion.accelerometerUpdateInterval = 0.1
    motion.startAccelerometerUpdates(to: OperationQueue.main) { [weak self] data, _ in
      guard let self = self, let acceleration = data?.acceleration else {
        return
      }
      let down = acceleration.z > 0.8
      if down == self.lastDown {
        return
      }
      self.lastDown = down
      self.sendEvent(withName: "faceDown", body: ["down": down])
    }
  }

  @objc
  func stop() {
    motion.stopAccelerometerUpdates()
    lastDown = nil
  }
}
