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
import ZingoFfi

/// What `backgroundWallet` found when preparing a background sync.
private enum BackgroundWalletLoad {
    case loaded(Wallet)
    /// The user is in offline mode (empty server URI); nothing to sync.
    case offline
    /// The wallet could not be loaded, carrying what went wrong so the
    /// background report names the cause instead of the symptom.
    case failed(String)
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
  private var syncTask: Task<Void, Never>?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    initLogging(maxLevel: .info)
    do {
      try installCryptoProvider()
    } catch {
      NSLog("Error: crypto provider install failed: \(error)")
    }

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
        // Cancelling the sync task ends the event loop; the loop then
        // pauses the sync, saves, and completes the task itself.
        task.expirationHandler = { [weak self] in
            NSLog("BGTask startBackgroundTask - expirationHandler called")
            self?.syncTask?.cancel()
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

        NSLog("BGTask startBackgroundTask run sync task")
        syncTask = Task(priority: .background) {
            await self.syncingProcessBackgroundTask(task)
        }
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

    private nonisolated static func timestamp() -> String {
        String(format: "%.0f", Date().timeIntervalSince1970)
    }

    /// Writes the background report and completes the task.
    private nonisolated func finish(
        _ task: BGProcessingTask, _ rpcmodule: RPCModule, start: String,
        message: String, error: String? = nil, success: Bool
    ) {
        let json = Self.buildBackgroundJSON(message: message, start: start, dateEnd: Self.timestamp(), error: error)
        do {
          try rpcmodule.saveBackgroundFile(json)
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(json)")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(json) error: \(error.localizedDescription)")
        }
        task.setTaskCompleted(success: success)
    }

    /// Follows the wallet's events until the sync ends or the task is cancelled, returning the failure detail if any.
    private nonisolated func followSync(_ wallet: Wallet) async -> String? {
        let events = wallet.events()
        defer { events.cancel() }
        do {
          try await wallet.startSync()
        } catch {
          return String(describing: error)
        }
        while let event = await withTaskCancellationHandler(
            operation: { await events.next() },
            onCancel: { events.cancel() }
        ) {
            switch event {
            case .syncProgress(let status):
                NSLog("BGTask syncingProcessBackgroundTask - sync STATUS %: \(status.percentageTotalOutputsScanned)")
            case .syncComplete(let result):
                NSLog("BGTask syncingProcessBackgroundTask - sync COMPLETED %: \(result.percentageTotalOutputsScanned)")
                return nil
            case .syncFailed(let error):
                return String(describing: error)
            case .drainProgress, .splitProgress, .batchProgress, .mixnetMode, .lagged:
                continue
            }
        }
        NSLog("BGTask syncingProcessBackgroundTask - sync cancelled by expiration handler")
        return nil
    }

    nonisolated func syncingProcessBackgroundTask(_ task: BGProcessingTask) async {
        let rpcmodule = RPCModule()
        let start = Self.timestamp()

        NSLog("BGTask syncingProcessBackgroundTask")

        let jsonBackgroundStart = Self.buildBackgroundJSON(message: "Starting OK.", start: start, dateEnd: "0")
        do {
          try rpcmodule.saveBackgroundFile(jsonBackgroundStart)
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundStart)")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundStart) error: \(error.localizedDescription)")
        }

        if await MainActor.run(body: { UIApplication.shared.applicationState == .active }) {
          NSLog("BGTask syncingProcessBackgroundTask - App in Foreground - cancel background task")
          finish(task, rpcmodule, start: start, message: "App in Foreground, Background task KO.", success: false)
          return
        }

        let exists: Bool
        do {
            exists = try rpcmodule.fileExists(Constants.WalletFileName.rawValue)
        } catch {
            NSLog("BGTask syncingProcessBackgroundTask - Wallet exists error: \(error.localizedDescription)")
            exists = false
        }
        guard exists else {
            NSLog("BGTask syncingProcessBackgroundTask - No exists wallet file END")
            finish(task, rpcmodule, start: start, message: "No active wallet KO.", success: false)
            return
        }

        let wallet: Wallet
        switch await backgroundWallet(rpcmodule) {
        case .failed(let reason):
            NSLog("BGTask syncingProcessBackgroundTask - Load wallet KO: \(reason)")
            finish(task, rpcmodule, start: start, message: "Load wallet process KO.",
                   error: "Load wallet process KO. \(reason)", success: false)
            return
        case .offline:
            NSLog("BGTask syncingProcessBackgroundTask - Offline mode, sync skipped")
            finish(task, rpcmodule, start: start, message: "Sync skipped - Offline mode.", success: true)
            return
        case .loaded(let open):
            wallet = open
        }

        let failure = await followSync(wallet)
        let expired = Task.isCancelled
        if expired {
            do {
              try await wallet.pauseSync()
            } catch {
              NSLog("BGTask syncingProcessBackgroundTask - pause sync error: \(error)")
            }
        }

        NSLog("BGTask syncingProcessBackgroundTask - syncing task STOPPED")

        do {
          try await rpcmodule.save(wallet)
          NSLog("BGTask syncingProcessBackgroundTask - Save Wallet")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save Wallet error: \(error.localizedDescription)")
        }

        if let failure {
            NSLog("BGTask syncingProcessBackgroundTask - run Sync error: \(failure)")
            finish(task, rpcmodule, start: start, message: "Run sync process KO.",
                   error: "Run sync process KO. \(failure)", success: false)
            return
        }
        finish(task, rpcmodule, start: start, message: "Finished OK.", success: !expired)
    }

    private nonisolated static func buildBackgroundJSON(message: String, start: String, dateEnd: String, error: String? = nil) -> String {
        let result = BackgroundTaskResult(
            batches: "0",
            message: message,
            date: start,
            dateEnd: dateEnd,
            error: error
        )
        guard let data = try? JSONEncoder().encode(result),
              let json = String(data: data, encoding: .utf8) else {
            return "{\"message\": \"\(message)\"}"
        }
        return json
    }

    /// The open wallet, or the wallet file opened with the server settings.json names.
    ///
    /// A failed load used to report the same "proceed" as a successful one,
    /// on the reasoning that the sync would surface its own error. It does,
    /// but that error names the symptom and hides the cause: an unreadable
    /// settings.json on a locked device reads exactly like a wallet that
    /// loaded fine and then failed to sync.
    private nonisolated func backgroundWallet(_ rpcmodule: RPCModule) async -> BackgroundWalletLoad {
        if let wallet = currentWallet() {
            return .loaded(wallet)
        }

        let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        guard let documentsDirectory = paths.first else {
            NSLog("Error: Unable to find documents directory")
            return .failed("unable to find the documents directory")
        }

        let fileName = "\(documentsDirectory)/settings.json"
        guard let content = try? String(contentsOfFile: fileName, encoding: .utf8) else {
            NSLog("Error: Unable to read file at path \(fileName)")
            return .failed("unable to read settings.json")
        }

        guard let contentData = content.data(using: .utf8),
              let jsonObject = try? JSONSerialization.jsonObject(with: contentData, options: []) as? [String: Any],
              let server = jsonObject["server"] as? [String: Any],
              let serverUri = server["uri"] as? String,
              let chain = server["chainName"] as? String else {
            NSLog("Error: Unable to parse JSON object from file at path \(fileName)")
            return .failed("unable to parse settings.json")
        }

        if serverUri.isEmpty {
            NSLog("Offline mode detected (empty serverUri) - skipping wallet load")
            return .offline
        }

        NSLog("Opening the wallet file - No App active - serverUri: \(serverUri) chain: \(chain)")
        do {
          return .loaded(try await rpcmodule.openWalletFile(
            serverUri: serverUri, chain: chain, performanceLevel: "Medium", minConfirmations: 3))
        } catch {
          NSLog("Error: Unable to load the wallet. error: \(error)")
          return .failed(String(describing: error))
        }
    }

    func cancelExecutingTask() {
        if let task = syncTask {
          NSLog("BGTask cancelling task")
          task.cancel()
          syncTask = nil
        }
    }

}
