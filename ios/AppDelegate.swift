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
import ZingoBindings

/// What `syncCaughtUp` answers: read from the engine's published status, so
/// a stale wallet never reads as caught up before the engine publishes.
struct SyncCaughtUp: Decodable {
    let caught_up: Bool
    let percent: Double?
}

/// How one wallet's turn in the nightly sync ended.
private enum BackgroundTurn {
    case synced
    case offline
    case foreground
    case cancelled
    case failed(String, String)

    /// The report this turn leaves when it is the active wallet's, nil when the night ends as Finished OK.
    var report: (message: String, error: String?)? {
        switch self {
        case .synced, .cancelled: return nil
        case .offline: return ("Sync skipped - Offline mode.", nil)
        case .foreground: return ("App in Foreground, Background task KO.", nil)
        case .failed(let message, let error): return (message: message, error: error)
        }
    }
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
  private var activeReport: (message: String, error: String?)? = nil
  
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
    
    // The engine would keep scanning after the task completes; end it so the
    // save holds the whole session and nothing runs on behind the app.
    private func stopSyncAndWait() {
        do {
            _ = try stopSync()
            let deadline = Date().addingTimeInterval(30)
            while Date() < deadline {
                let poll = try pollSync()
                if !poll.lowercased().hasPrefix("sync task is not complete") {
                    return
                }
                _ = DispatchSemaphore(value: 0).wait(timeout: .now() + 0.2)
            }
            NSLog("BGTask stopSyncAndWait - timed out")
        } catch {
            NSLog("BGTask stopSyncAndWait - error: \(error.localizedDescription)")
        }
    }

    private func startBackgroundTask(_ task: BGProcessingTask) {
        task.expirationHandler = {
            NSLog("BGTask startBackgroundTask - expirationHandler called")
            // stop the sync process, can't wait to check if the process is over.
            // have no time here
            self.syncWorkItem?.cancel()
            _ = try? stopSync()
            
            let rpcmodule = RPCModule()

            // save the wallet
            do {
              try rpcmodule.saveWalletInternal()
              NSLog("BGTask startBackgroundTask - expirationHandler Save Wallet")
            } catch {
              NSLog("BGTask startBackgroundTask - expirationHandler Save Wallet error: \(error.localizedDescription)")
            }
            if RPCModule.openWalletId != (try? rpcmodule.activeWalletId()) {
              rpcmodule.closeWalletFile()
            }

            let report = self.activeReport ?? (message: "Finished OK.", error: nil)
            self.saveReport(message: report.message, error: report.error)
            self.completeTask(success: false)
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

        let timeStampStart = Date().timeIntervalSince1970
        self.timeStampStrStart = String(format: "%.0f", timeStampStart)
        self.activeReport = nil
        saveReport(message: "Starting OK.", dateEnd: "0")

        if isAppInForeground() {
            NSLog("BGTask syncingProcessBackgroundTask - App in Foreground - cancel background task")
            saveReport(message: "App in Foreground, Background task KO.")
            completeTask(success: false)
            return
        }

        let documents: String
        let active: String?
        do {
            try rpcmodule.prepareWallets()
            documents = try rpcmodule.getDocumentsDirectory()
            active = try rpcmodule.activeWalletId()
        } catch {
            NSLog("BGTask syncingProcessBackgroundTask - Wallet exists error: \(error.localizedDescription)")
            saveReport(message: "No active wallet KO.")
            completeTask(success: false)
            return
        }
        guard let active else {
            NSLog("BGTask syncingProcessBackgroundTask - No exists wallet file END")
            saveReport(message: "No active wallet KO.")
            completeTask(success: false)
            return
        }

        var activeTurn = BackgroundTurn.synced
        for id in WalletStore.syncOrder(documents) {
            let turn = syncWallet(id, isActive: id == active)
            if id == active {
                activeTurn = turn
                self.activeReport = turn.report
            }
            if case .cancelled = turn {
                return
            }
            if case .foreground = turn {
                break
            }
        }
        if RPCModule.openWalletId != active && !isAppInForeground() {
            rpcmodule.closeWalletFile()
        }

        let report = activeTurn.report ?? (message: "Finished OK.", error: nil)
        saveReport(message: report.message, error: report.error)
        switch activeTurn {
        case .failed, .foreground:
            completeTask(success: false)
        default:
            completeTask(success: true)
        }
    }

    /// Syncs the wallet `id` until it catches up, then saves it.
    private func syncWallet(_ id: String, isActive: Bool) -> BackgroundTurn {
        let rpcmodule = RPCModule()
        if syncWorkItem?.isCancelled == true {
            return .cancelled
        }
        if isAppInForeground() {
            return .foreground
        }
        do {
            guard let server = try (isActive ? rpcmodule.activeServer() : rpcmodule.walletServer(id)) else {
                return .failed("Load wallet process KO.", "Load wallet process KO. the wallet \(id) has no server")
            }
            if server.uri.isEmpty {
                NSLog("BGTask syncWallet - Offline mode, sync skipped for wallet \(id)")
                return .offline
            }
            NSLog("BGTask syncWallet - Opening the wallet \(id) - serveruri: \(server.uri) chain: \(server.chain)")
            _ = try rpcmodule.fnLoadWallet(
                walletId: id, serveruri: server.uri, chainhint: server.chain, performancelevel: "Medium",
                minconfirmations: "3", activate: false)
        } catch {
            NSLog("BGTask syncWallet - Load wallet \(id) error: \(error.localizedDescription)")
            return .failed("Load wallet process KO.", "Load wallet process KO. \(error.localizedDescription)")
        }

        do {
            let syncing = try runSync()
            NSLog("BGTask syncWallet - sync LAUNCH \(id) \(String(syncing))")
        } catch ZingolibError.Offline(_) {
            return .offline
        } catch {
            NSLog("BGTask syncWallet - run Sync \(id) error: \(error.localizedDescription)")
            return .failed("Run sync process KO.", "Run sync process KO. \(error.localizedDescription)")
        }

        while true {
            if syncWorkItem?.isCancelled == true {
                NSLog("BGTask syncWallet - sync cancelled by expiration handler")
                return .cancelled
            }
            if isAppInForeground() {
                if RPCModule.openWalletId == id {
                    stopAndSave(id)
                }
                return .foreground
            }
            let syncStatusJson: String
            do {
                // The session is continuous: it never ends on its own, so
                // one that has ended stopped on a failure, which pollSync
                // throws.
                let poll = try pollSync()
                if !poll.lowercased().hasPrefix("sync task is not complete") {
                    NSLog("BGTask syncWallet - sync ENDED \(id) \(poll)")
                    break
                }
                syncStatusJson = try syncCaughtUp()
            } catch {
                NSLog("BGTask syncWallet - sync STATUS \(id) error: \(error.localizedDescription)")
                stopSyncAndWait()
                return .failed("Status sync process KO.", "Status sync process KO. \(error.localizedDescription)")
            }
            do {
                let status = try JSONDecoder().decode(SyncCaughtUp.self, from: Data(syncStatusJson.utf8))
                let percent = status.percent ?? 0
                if status.caught_up {
                    NSLog("BGTask syncWallet - sync CAUGHT UP \(id) %: \(percent)")
                    break
                }
                NSLog("BGTask syncWallet - sync STATUS \(id) %: \(percent)")
            } catch {
                NSLog("BGTask syncWallet - sync STATUS parsing \(id) error: \(error)")
                stopSyncAndWait()
                return .failed("Status sync parsing process KO.", "Status sync parsing process KO. \(error.localizedDescription)")
            }
            _ = DispatchSemaphore(value: 0).wait(timeout: .now() + 5)
        }

        stopAndSave(id)
        return .synced
    }

    /// Ends the wallet's sync and saves what it reached.
    private func stopAndSave(_ id: String) {
        stopSyncAndWait()
        do {
            try RPCModule().saveWalletInternal()
            NSLog("BGTask stopAndSave - Save Wallet \(id)")
        } catch {
            NSLog("BGTask stopAndSave - Save Wallet \(id) error: \(error.localizedDescription)")
        }
    }

    private func completeTask(success: Bool) {
        bgTask?.setTaskCompleted(success: success)
        bgTask = nil
    }

    /// Writes the night's result to the background JSON file.
    private func saveReport(message: String, dateEnd: String? = nil, error: String? = nil) {
        let end = dateEnd ?? String(format: "%.0f", Date().timeIntervalSince1970)
        let json = buildBackgroundJSON(message: message, dateEnd: end, error: error)
        do {
            try RPCModule().saveBackgroundFile(json)
            NSLog("BGTask saveReport - Save background JSON \(json)")
        } catch {
            NSLog("BGTask saveReport - Save background JSON \(json) error: \(error.localizedDescription)")
        }
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

    func cancelExecutingTask() {
        if let task = self.bgTask {
          NSLog("BGTask cancelling task")
          task.setTaskCompleted(success: false)
          bgTask = nil
        }
    }

}
