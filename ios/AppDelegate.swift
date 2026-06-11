//
//  AppDelegate.swift
//  Zingo
//
//  Created by Juan Carlos Carmona Calvo on 4/4/24.
//

import Foundation
import UIKit
import BackgroundTasks
import Network
import React_RCTAppDelegate
import ReactAppDependencyProvider

struct ScanRanges: Decodable {
    let priority: String
    let start_block: String
    let end_block: String
}

struct SyncStatus: Decodable {
    let scan_ranges: [ScanRanges]?
    let sync_start_height: Int64?
    let session_blocks_scanned: Int64?
    let total_blocks_scanned: Int64?
    let percentage_session_blocks_scanned: Double?
    let percentage_total_blocks_scanned: Double?
    let session_sapling_outputs_scanned: Int64?
    let total_sapling_outputs_scanned: Int64?
    let session_orchard_outputs_scanned: Int64?
    let total_orchard_outputs_scanned: Int64?
    let percentage_session_outputs_scanned: Double?
    let percentage_total_outputs_scanned: Double?
}

private struct BackgroundTaskResult: Encodable {
    let batches: String
    let message: String
    let date: String
    let dateEnd: String
    let error: String?

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(batches, forKey: .batches)
        try container.encode(message, forKey: .message)
        try container.encode(date, forKey: .date)
        try container.encode(dateEnd, forKey: .dateEnd)
        try container.encodeIfPresent(error, forKey: .error)
    }

    enum CodingKeys: String, CodingKey {
        case batches, message, date, dateEnd, error
    }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private let bcgTaskId = "Zingo_Processing_Task_ID"
  private let bcgSchedulerTaskId = "Zingo_Processing_Scheduler_Task_ID"
  private var monitor: NWPathMonitor?
  private let workerQueue = DispatchQueue(label: "Monitor")
  private var isConnectedToWifi = false
  private var bgTask: BGProcessingTask? = nil
  private var timeStampStrStart: String? = nil
  private var syncWorkItem: DispatchWorkItem?
  
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
 
    reactNativeDelegate = delegate
    reactNativeFactory = factory

    if #available(iOS 13.0, *) {
      NSLog("BGTask registerTasks")
      self.handleBackgroundTask()
    }
 
    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
  }

  func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {}

  func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(application, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?
  ) -> Void) -> Bool {
        return RCTLinkingManager.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
    )
  }

  func handleForeground() {
    if #available(iOS 13.0, *) {
      NSLog("BGTask foreground")
      self.cancelExecutingTask()

      NSLog("BGTask foreground - scheduleBackgroundTask")
      self.scheduleBackgroundTask()
      NSLog("BGTask foreground - scheduleSchedulerBackgroundTask")
      self.scheduleSchedulerBackgroundTask()
    }
  }

  func handleBackground() {
    if #available(iOS 13.0, *) {
      NSLog("BGTask background")

      NSLog("BGTask background - scheduleBackgroundTask")
      self.scheduleBackgroundTask()
      NSLog("BGTask background - scheduleSchedulerBackgroundTask")
      self.scheduleSchedulerBackgroundTask()
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

extension AppDelegate {
    private func handleBackgroundTask() {
        // We require the background task to run when connected to the power and wifi
        monitor = NWPathMonitor(requiredInterfaceType: .wifi)
        monitor?.pathUpdateHandler = { [weak self] path in
            if path.status == .satisfied {
                self?.isConnectedToWifi = true
            } else {
                self?.isConnectedToWifi = false
            }
            NSLog("BGTask isConnectedToWifi \(path.status == .satisfied)")
        }
        monitor?.start(queue: workerQueue)
        
        registerTasks()
    }
    
    private func registerTasks() {
        let bcgSyncTaskResult = BGTaskScheduler.shared.register(
            forTaskWithIdentifier: bcgTaskId,
            using: DispatchQueue.main
        ) { [self] task in
            NSLog("BGTask BGTaskScheduler.shared.register SYNC called")
            guard let task = task as? BGProcessingTask else {
                return
            }
            
            NSLog("BGTask BGTaskScheduler.shared.register SYNC called")
            self.bgTask = task
            self.startBackgroundTask(task)
        }

        NSLog("BGTask SYNC registered \(bcgSyncTaskResult)")

        let bcgSchedulerTaskResult = BGTaskScheduler.shared.register(
            forTaskWithIdentifier: bcgSchedulerTaskId,
            using: DispatchQueue.main
        ) { [self] task in
            NSLog("BGTask BGTaskScheduler.shared.register SCHEDULER called")
            guard let task = task as? BGProcessingTask else {
                return
            }

            scheduleSchedulerBackgroundTask()
            scheduleBackgroundTask()
            
            task.setTaskCompleted(success: true)
        }
        
        NSLog("BGTask SCHEDULER registered \(bcgSchedulerTaskResult)")
    }
    
    private func startBackgroundTask(_ task: BGProcessingTask) {
        task.expirationHandler = {
            NSLog("BGTask startBackgroundTask - expirationHandler called")
            // stop the sync process, can't wait to check if the process is over.
            // have no time here
            self.syncWorkItem?.cancel()
            
            let rpcmodule = RPCModule()

            // save the wallet
            do {
              try rpcmodule.saveWalletInternal()
              NSLog("BGTask startBackgroundTask - expirationHandler Save Wallet")
            } catch {
              NSLog("BGTask startBackgroundTask - expirationHandler Save Wallet error: \(error.localizedDescription)")
            }

            // save the background file
            let timeStamp = Date().timeIntervalSince1970
            let timeStampStr = String(format: "%.0f", timeStamp)
            let jsonBackground = self.buildBackgroundJSON(message: "Finished OK.", dateEnd: timeStampStr)
            do {
              try rpcmodule.saveBackgroundFile(jsonBackground)
              NSLog("BGTask startBackgroundTask - expirationHandler Save background JSON \(jsonBackground)")
            } catch {
              NSLog("BGTask startBackgroundTask - expirationHandler Save background JSON \(jsonBackground) error: \(error.localizedDescription)")
            }
          
            if let task = self.bgTask {
              task.setTaskCompleted(success: false)
            }
            self.bgTask = nil
            NSLog("BGTask startBackgroundTask - expirationHandler THE END")
        }

        NSLog("BGTask startBackgroundTask called")
        
        // schedule tasks for the next time
        scheduleBackgroundTask()
        scheduleSchedulerBackgroundTask()

        guard isConnectedToWifi else {
            NSLog("BGTask startBackgroundTask: not connected to the wifi")
            task.setTaskCompleted(success: false)
            return
        }
        
        // Start sync process
        NSLog("BGTask startBackgroundTask run sync task")
        // to run only one task
        syncWorkItem = DispatchWorkItem {
            self.syncingProcessBackgroundTask()
        }

        DispatchQueue.global(qos: .background).async(execute: syncWorkItem!)
    }
    
    func scheduleBackgroundTask() {
        // This method can be called as many times as needed, the previously submitted
        // request will be overridden by the new one.
        NSLog("BGTask scheduleBackgroundTask called")
        
        let request = BGProcessingTaskRequest(identifier: bcgTaskId)
        
        let today = Calendar.current.startOfDay(for: .now)
        guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else {
            NSLog("BGTask scheduleBackgroundTask failed to schedule time")
            return
        }
      
        // TESTING
        //let oneMinuteLater = Date().addingTimeInterval(60)
        //request.earliestBeginDate = oneMinuteLater
        //NSLog("BGTask scheduleBackgroundTask date test calculated: \(String(describing: oneMinuteLater))")

        // PRODUCTION
        let earlyMorningComponent = DateComponents(hour: 3, minute: Int.random(in: 0...60))
        let earlyMorning = Calendar.current.date(byAdding: earlyMorningComponent, to: tomorrow)
        request.earliestBeginDate = earlyMorning
        NSLog("BGTask scheduleBackgroundTask date calculated: \(String(describing: earlyMorning))")
        
        request.requiresExternalPower = true
        request.requiresNetworkConnectivity = true
        
        do {
            try BGTaskScheduler.shared.submit(request)
            NSLog("BGTask scheduleBackgroundTask succeeded to submit")
        } catch {
            NSLog("BGTask scheduleBackgroundTask failed to submit, error: \(error)")
        }
    }
    
    func scheduleSchedulerBackgroundTask() {
        // This method can be called as many times as needed, the previously submitted
        // request will be overridden by the new one.
        NSLog("BGTask scheduleSchedulerBackgroundTask called")
        
        let request = BGProcessingTaskRequest(identifier: bcgSchedulerTaskId)
        
        let today = Calendar.current.startOfDay(for: .now)
        guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else {
            NSLog("BGTask scheduleSchedulerBackgroundTask failed to schedule time")
            return
        }
        
        let afternoonComponent = DateComponents(hour: 14, minute: Int.random(in: 0...60))
        let afternoon = Calendar.current.date(byAdding: afternoonComponent, to: tomorrow)
        request.earliestBeginDate = afternoon
        request.requiresExternalPower = false
        request.requiresNetworkConnectivity = false
      
        NSLog("BGTask scheduleSchedulerBackgroundTask date calculated: \(String(describing: afternoon))")
        
        do {
            try BGTaskScheduler.shared.submit(request)
            NSLog("BGTask scheduleSchedulerBackgroundTask succeeded to submit")
        } catch {
            NSLog("BGTask scheduleSchedulerBackgroundTask failed to submit, error: \(error)")
        }
    }
  
    func isAppInForeground() -> Bool {
        var result = false
        DispatchQueue.main.sync {
            result = UIApplication.shared.applicationState == .active
        }
        return result
    }

    func syncingProcessBackgroundTask() {
        let rpcmodule = RPCModule()

        NSLog("BGTask syncingProcessBackgroundTask")
      
        // save the background file
        let timeStampStart = Date().timeIntervalSince1970
        self.timeStampStrStart = String(format: "%.0f", timeStampStart)
        let jsonBackgroundStart = self.buildBackgroundJSON(message: "Starting OK.", dateEnd: "0")
        do {
          try rpcmodule.saveBackgroundFile(jsonBackgroundStart)
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundStart)")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundStart) error: \(error.localizedDescription)")
        }
      
        if isAppInForeground() {
          NSLog("BGTask syncingProcessBackgroundTask - App in Foreground - cancel background task")

          // save the background file
          let timeStampError = Date().timeIntervalSince1970
          let timeStampStrError = String(format: "%.0f", timeStampError)
          let jsonBackgroundError = self.buildBackgroundJSON(message: "App in Foreground, Background task KO.", dateEnd: timeStampStrError)
          do {
            try rpcmodule.saveBackgroundFile(jsonBackgroundError)
            NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")
          } catch {
            NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError) error: \(error.localizedDescription)")
          }
          
          if let task = self.bgTask {
            task.setTaskCompleted(success: false)
          }
          bgTask = nil
          return
        }

        do {
          let setCrytoProvider = try setCryptoDefaultProviderToRing()
          NSLog("BGTask syncingProcessBackgroundTask - Crypto provider default \(setCrytoProvider)")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Crypto provider default error: \(error.localizedDescription)")

          // save the background file
          let timeStampError = Date().timeIntervalSince1970
          let timeStampStrError = String(format: "%.0f", timeStampError)
          let jsonBackgroundError = self.buildBackgroundJSON(message: "Crypto provider default KO.", dateEnd: timeStampStrError, error: "Crypto provider default KO. \(error.localizedDescription)")
          do {
            try rpcmodule.saveBackgroundFile(jsonBackgroundError)
            NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")
          } catch {
            NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError) error: \(error.localizedDescription)")
          }
          
          if let task = self.bgTask {
            task.setTaskCompleted(success: false)
          }
          bgTask = nil
          return
        }

        var exists: String = "false"
        do {
            exists = try rpcmodule.fileExists(Constants.WalletFileName.rawValue)
        } catch {
            NSLog("BGTask syncingProcessBackgroundTask - Wallet exists error: \(error.localizedDescription)")
        }
      
        if exists == "true" {
            // load the wallet file
            let shouldSync = self.loadWalletFile()

            if !shouldSync {
                NSLog("BGTask syncingProcessBackgroundTask - Offline mode, sync skipped")
                let timeStampOffline = Date().timeIntervalSince1970
                let timeStampStrOffline = String(format: "%.0f", timeStampOffline)
                let jsonBackgroundOffline = self.buildBackgroundJSON(message: "Sync skipped - Offline mode.", dateEnd: timeStampStrOffline)
                do {
                  try rpcmodule.saveBackgroundFile(jsonBackgroundOffline)
                  NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundOffline)")
                } catch {
                  NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundOffline) error: \(error.localizedDescription)")
                }
                if let task = self.bgTask {
                  task.setTaskCompleted(success: true)
                }
                bgTask = nil
                return
            }

            // run the sync process.
            do {
              let syncing = try runSync()
              let syncingStr = String(syncing)
              NSLog("BGTask syncingProcessBackgroundTask - sync LAUNCH \(syncingStr)")
            } catch {
              NSLog("BGTask syncingProcessBackgroundTask - run Sync error: \(error.localizedDescription)")

              // save the background file
              let timeStampError = Date().timeIntervalSince1970
              let timeStampStrError = String(format: "%.0f", timeStampError)
              let jsonBackgroundError = self.buildBackgroundJSON(message: "Run sync process KO.", dateEnd: timeStampStrError, error: "Run sync process KO. \(error.localizedDescription)")
              do {
                try rpcmodule.saveBackgroundFile(jsonBackgroundError)
                NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")
              } catch {
                NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError) error: \(error.localizedDescription)")
              }
              
              if let task = self.bgTask {
                task.setTaskCompleted(success: false)
              }
              bgTask = nil
              return
            }

            var syncStatus: SyncStatus?
            while true {
                if syncWorkItem?.isCancelled == true {
                    NSLog("BGTask syncingProcessBackgroundTask - sync cancelled by expiration handler")
                    return
                }
                var syncStatusJson: String = ""
                do {
                  syncStatusJson = try statusSync()
                  if syncStatusJson.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
                    NSLog("BGTask syncingProcessBackgroundTask - sync STATUS error: \(syncStatusJson)")
                    
                    // save the background file
                    let timeStampError = Date().timeIntervalSince1970
                    let timeStampStrError = String(format: "%.0f", timeStampError)
                    let jsonBackgroundError = self.buildBackgroundJSON(message: "Status sync process KO.", dateEnd: timeStampStrError, error: "Status sync process KO. \(syncStatusJson)")
                    do {
                      try rpcmodule.saveBackgroundFile(jsonBackgroundError)
                      NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")
                    } catch {
                      NSLog("BGTask syncingProcessBackgroundTask - Save background JSON error: \(error.localizedDescription)")
                    }
                    
                    if let task = self.bgTask {
                      task.setTaskCompleted(success: false)
                    }
                    bgTask = nil
                    return
                  }
                } catch {
                  NSLog("BGTask syncingProcessBackgroundTask - sync STATUS error: \(error.localizedDescription)")

                  // save the background file
                  let timeStampError = Date().timeIntervalSince1970
                  let timeStampStrError = String(format: "%.0f", timeStampError)
                  let jsonBackgroundError = self.buildBackgroundJSON(message: "Status sync process KO.", dateEnd: timeStampStrError, error: "Status sync process KO. \(error.localizedDescription)")
                  do {
                    try rpcmodule.saveBackgroundFile(jsonBackgroundError)
                    NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")
                  } catch {
                    NSLog("BGTask syncingProcessBackgroundTask - Save background JSON error: \(error.localizedDescription)")
                  }
                  
                  if let task = self.bgTask {
                    task.setTaskCompleted(success: false)
                  }
                  bgTask = nil
                  return
                }

                do {
                  guard let data = syncStatusJson.data(using: .utf8) else {
                    NSLog("BGTask syncingProcessBackgroundTask - failed to encode syncStatusJson")
                    if let task = self.bgTask {
                      task.setTaskCompleted(success: false)
                    }
                    bgTask = nil
                    return
                  }
                  syncStatus = try JSONDecoder().decode(SyncStatus.self, from: data)

                  let percent =
                    syncStatus?.percentage_total_outputs_scanned
                    ?? syncStatus?.percentage_total_blocks_scanned
                    ?? 0

                  if percent >= 100.0 {
                      NSLog("BGTask syncingProcessBackgroundTask - sync COMPLETED %: \(percent)")
                      break
                  } else {
                      NSLog("BGTask syncingProcessBackgroundTask - sync STATUS %: \(percent)")
                  }
                } catch {
                  NSLog("BGTask syncingProcessBackgroundTask - sync STATUS parsing error: \(error)")
                  // save the background file
                  let timeStampError = Date().timeIntervalSince1970
                  let timeStampStrError = String(format: "%.0f", timeStampError)
                  let jsonBackgroundError = self.buildBackgroundJSON(message: "Status sync parsing process KO.", dateEnd: timeStampStrError, error: "Status sync parsing process KO. \(error.localizedDescription)")
                  do {
                    try rpcmodule.saveBackgroundFile(jsonBackgroundError)
                    NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")
                  } catch {
                    NSLog("BGTask syncingProcessBackgroundTask - Save background JSON error: \(error.localizedDescription)")
                  }
                  
                  if let task = self.bgTask {
                    task.setTaskCompleted(success: false)
                  }
                  bgTask = nil
                  return
                }

                //Thread.sleep(forTimeInterval: 5)
                _ = DispatchSemaphore(value: 0).wait(timeout: .now() + 5)
            }

        } else {
            // no wallet file
            NSLog("BGTask syncingProcessBackgroundTask - No exists wallet file END")

            // save the background file
            let timeStampError = Date().timeIntervalSince1970
            let timeStampStrError = String(format: "%.0f", timeStampError)
            let jsonBackgroundError = self.buildBackgroundJSON(message: "No active wallet KO.", dateEnd: timeStampStrError)
            do {
              try rpcmodule.saveBackgroundFile(jsonBackgroundError)
              NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")
            } catch {
              NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError) error: \(error.localizedDescription)")
            }
            
            if let task = self.bgTask {
              task.setTaskCompleted(success: false)
            }
            bgTask = nil
            return
        }

        NSLog("BGTask syncingProcessBackgroundTask - syncing task STOPPED")

        // save the wallet
        do {
          try rpcmodule.saveWalletInternal()
          NSLog("BGTask syncingProcessBackgroundTask - Save Wallet")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save Wallet error: \(error.localizedDescription)")
        }
        
        // save the background file
        let timeStampEnd = Date().timeIntervalSince1970
        let timeStampStrEnd = String(format: "%.0f", timeStampEnd)
        let jsonBackgroundEnd = self.buildBackgroundJSON(message: "Finished OK.", dateEnd: timeStampStrEnd)
        do {
          try rpcmodule.saveBackgroundFile(jsonBackgroundEnd)
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundEnd)")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundEnd) error: \(error.localizedDescription)")
        }

        if let task = self.bgTask {
          task.setTaskCompleted(success: true)
        }
        bgTask = nil
    }

    private func buildBackgroundJSON(message: String, dateEnd: String, error: String? = nil) -> String {
        let result = BackgroundTaskResult(
            batches: "0",
            message: message,
            date: timeStampStrStart ?? "0",
            dateEnd: dateEnd,
            error: error
        )
        guard let data = try? JSONEncoder().encode(result),
              let json = String(data: data, encoding: .utf8) else {
            return "{\"message\": \"\(message)\"}"
        }
        return json
    }

    /// Reads settings.json and loads the wallet file when a server URI is
    /// configured. Returns `true` to signal the caller may proceed with sync, or
    /// `false` only when the user is explicitly in offline mode (empty server
    /// URI) and sync must be skipped. On any other unexpected condition the
    /// function returns `true` so the downstream sync path surfaces its own
    /// error rather than masquerading as offline mode.
    func loadWalletFile() -> Bool {
        let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        guard let documentsDirectory = paths.first else {
            NSLog("Error: Unable to find documents directory")
            return true
        }

        let fileName = "\(documentsDirectory)/settings.json"
        guard let content = try? String(contentsOfFile: fileName, encoding: .utf8) else {
            NSLog("Error: Unable to read file at path \(fileName)")
            return true
        }

        guard let contentData = content.data(using: .utf8),
              let jsonObject = try? JSONSerialization.jsonObject(with: contentData, options: []) as? [String: Any],
              let server = jsonObject["server"] as? [String: Any],
              let serveruri = server["uri"] as? String,
              let chainhint = server["chainName"] as? String else {
            NSLog("Error: Unable to parse JSON object from file at path \(fileName)")
            return true
        }

        if serveruri.isEmpty {
            NSLog("Offline mode detected (empty serveruri) - skipping wallet load")
            return false
        }

        NSLog("Opening the wallet file - No App active - serveruri: \(serveruri) chain: \(chainhint)")
        let rpcmodule = RPCModule()
        do {
          _ = try rpcmodule.fnLoadExistingWallet(serveruri: serveruri, chainhint: chainhint, performancelevel: "Medium", minconfirmations: "3")
        } catch {
          NSLog("Error: Unable to load the wallet. error: \(error.localizedDescription)")
        }
        return true
    }

    func cancelExecutingTask() {
        if let task = self.bgTask {
          NSLog("BGTask cancelling task")
          task.setTaskCompleted(success: false)
          bgTask = nil
        }
    }

}
