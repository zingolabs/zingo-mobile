//
//  AppDelegate.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/4/24.
//

import Foundation
import UIKit
import BackgroundTasks

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  private let bcgTaskId = "Zingo_Processing_Task_ID"
  private let bcgSchedulerTaskId = "Zingo_Processing_Scheduler_Task_ID"
  private var monitor: NWPathMonitor?
  private let workerQueue = DispatchQueue(label: "Monitor")
  private var isConnectedToWifi = false
  var window: UIWindow?
  private var bridge: RCTBridge!
  private var bgTask: BGProcessingTask? = nil
  private var timeStampStrStart: String? = nil
  private let errorPrefix = "error"


  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let jsCodeLocation: URL

    jsCodeLocation = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index", fallbackResource: nil)
    let rootView = RCTRootView(bundleURL: jsCodeLocation, moduleName: "Zingo!", initialProperties: nil, launchOptions: launchOptions)
    let rootViewController = UIViewController()
    rootViewController.view = rootView

    self.window = UIWindow(frame: UIScreen.main.bounds)
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()

    if #available(iOS 13.0, *) {
      NSLog("BGTask registerTasks")
      self.handleBackgroundTask()
    }

    return true
  }

  func applicationWillEnterForeground(_ application: UIApplication) {
    if #available(iOS 13.0, *) {
        // cancel existing sync process (if any).
        NSLog("BGTask foreground")
        self.stopSyncingProcess()

        // cancel bg task
        if let task = self.bgTask {
            NSLog("BGTask foreground - sync task CANCEL")
            task.setTaskCompleted(success: false)
        }
        self.bgTask = nil
    }
  }

  func applicationDidEnterBackground(_ application: UIApplication) {
    if #available(iOS 13.0, *) {
        // Cancel existing sync process (if any).
        NSLog("BGTask background")
        self.stopSyncingProcess()

        // Cancel bg task
        if let task = self.bgTask {
            NSLog("BGTask background - sync task CANCEL")
            task.setTaskCompleted(success: false)
        }
        self.bgTask = nil

        NSLog("BGTask background - scheduleBackgroundTask")
        self.scheduleBackgroundTask()
        NSLog("BGTask background - scheduleSchedulerBackgroundTask")
        self.scheduleSchedulerBackgroundTask()
    }
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
        self.syncingProcessBackgroundTask()

        task.expirationHandler = {
            NSLog("BGTask startBackgroundTask - expirationHandler called")
            // stop the sync process, can't wait to check if the process is over.
            // have no time here
            let interruptStr = executeCommand(cmd: "interrupt_sync_after_batch", args: "true")
            NSLog("BGTask startBackgroundTask - expirationHandler interrupt syncing \(interruptStr)")
            
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
            let jsonBackground = "{\"batches\": \"0\", \"message\": \"Finished OK.\", \"date\": \"\(self.timeStampStrStart ?? "0")\", \"dateEnd\": \"\(timeStampStr)\"}"
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
        
        let earlyMorningComponent = DateComponents(hour: 3, minute: Int.random(in: 0...60))
        let earlyMorning = Calendar.current.date(byAdding: earlyMorningComponent, to: tomorrow)
        request.earliestBeginDate = earlyMorning
        request.requiresExternalPower = true
        request.requiresNetworkConnectivity = true
      
        NSLog("BGTask scheduleBackgroundTask date calculated: \(String(describing: earlyMorning))")
        
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

    func stopSyncingProcess() {
        NSLog("BGTask stopSyncingProcess")
        let statusStr = executeCommand(cmd: "syncstatus", args: "")
        if statusStr.lowercased().hasPrefix(errorPrefix) {
            NSLog("BGTask stopSyncingProcess - no lightwalled likely")
            return
        }
        NSLog("BGTask stopSyncingProcess - status response \(statusStr)")

        guard let data = statusStr.data(using: .utf8),
              let jsonResp = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
              var inProgress = jsonResp["in_progress"] as? Bool else {
            NSLog("BGTask stopSyncingProcess - error parsing JSON response")
            return
        }

        while inProgress {
            let interruptStr = executeCommand(cmd: "interrupt_sync_after_batch", args: "true")
            NSLog("BGTask stopSyncingProcess - interrupt syncing \(interruptStr)")

            Thread.sleep(forTimeInterval: 0.5)

            let newStatusStr = executeCommand(cmd: "syncstatus", args: "")
            if newStatusStr.lowercased().hasPrefix(errorPrefix) {
                NSLog("BGTask stopSyncingProcess - error getting new status")
                return
            }
            NSLog("BGTask stopSyncingProcess - status response \(newStatusStr)")

            guard let newData = newStatusStr.data(using: .utf8),
                  let newJsonResp = try? JSONSerialization.jsonObject(with: newData, options: []) as? [String: Any],
                  let newInProgress = newJsonResp["in_progress"] as? Bool else {
                NSLog("BGTask stopSyncingProcess - error parsing new JSON response")
                return
            }

            inProgress = newInProgress
        }

        NSLog("BGTask stopSyncingProcess - syncing process STOPPED")
    }

    func syncingProcessBackgroundTask() {
        let rpcmodule = RPCModule()

        // save the background file
        let timeStampStart = Date().timeIntervalSince1970
        self.timeStampStrStart = String(format: "%.0f", timeStampStart)
        let jsonBackgroundStart = "{\"batches\": \"0\", \"message\": \"Starting OK.\", \"date\": \"\(self.timeStampStrStart ?? "0")\", \"dateEnd\": \"0\"}"
        do {
          try rpcmodule.saveBackgroundFile(jsonBackgroundStart)
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundStart)")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundStart) error: \(error.localizedDescription)")
        }

        NSLog("BGTask syncingProcessBackgroundTask")
        let exists = rpcmodule.wallet_exists()

        if exists {
            // chaeck the server
            let balance = executeCommand(cmd: "balance", args: "")
            let balanceStr = String(balance)
            NSLog("BGTask syncingProcessBackgroundTask - testing if server is active \(balanceStr)")
            if balanceStr.lowercased().hasPrefix(errorPrefix) {
                // this task is running with the App closed.
                self.loadWalletFile()
            } else {
                // the App is open, stop the sync first, just in case.
                self.stopSyncingProcess()
            }

            // deactivate the flag for interrupting the sync process.
            let noInterrupt = executeCommand(cmd: "interrupt_sync_after_batch", args: "false")
            let noInterruptStr = String(noInterrupt)
            NSLog("BGTask syncingProcessBackgroundTask - no interrupt syncing \(noInterruptStr)")

            // run the sync process.
            NSLog("BGTask syncingProcessBackgroundTask - sync BEGIN")
            let syncing = executeCommand(cmd: "sync", args: "")
            let syncingStr = String(syncing)
            NSLog("BGTask syncingProcessBackgroundTask - sync END \(syncingStr)")

        } else {
            // no wallet file
            NSLog("BGTask syncingProcessBackgroundTask - No exists wallet file END")

            // save the background file
            let timeStampError = Date().timeIntervalSince1970
            let timeStampStrError = String(format: "%.0f", timeStampError)
            let jsonBackgroundError = "{\"batches\": \"0\", \"message\": \"No active wallet KO.\", \"date\": \"\(self.timeStampStrStart ?? "0")\", \"dateEnd\": \"\(timeStampStrError)\"}"
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
        let jsonBackgroundEnd = "{\"batches\": \"0\", \"message\": \"Finished OK.\", \"date\": \"\(self.timeStampStrStart ?? "0")\", \"dateEnd\": \"\(timeStampStrEnd)\"}"
        do {
          try rpcmodule.saveBackgroundFile(jsonBackgroundEnd)
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundEnd)")
        } catch {
          NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundEnd) error: \(error.localizedDescription)")
        }

        if let task = self.bgTask {
          task.setTaskCompleted(success: false)
        }
        bgTask = nil
    }

    func loadWalletFile() {
        let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        guard let documentsDirectory = paths.first else {
            NSLog("Error: Unable to find documents directory")
            return
        }

        let fileName = "\(documentsDirectory)/settings.json"
        guard let content = try? String(contentsOfFile: fileName, encoding: .utf8) else {
            NSLog("Error: Unable to read file at path \(fileName)")
            return
        }

        guard let contentData = content.data(using: .utf8),
              let jsonObject = try? JSONSerialization.jsonObject(with: contentData, options: []) as? [String: Any],
              let server = jsonObject["server"] as? [String: Any],
              let serverURI = server["uri"] as? String,
              let chainhint = server["chain_name"] as? String else {
            NSLog("Error: Unable to parse JSON object from file at path \(fileName)")
            return
        }

        NSLog("Opening the wallet file - No App active - server: \(serverURI) chain: \(chainhint)")
        let rpcmodule = RPCModule()
        do {
          _ = try rpcmodule.loadExistingWallet(server: serverURI, chainhint: chainhint)
        } catch {
          NSLog("Error: Unable to load the wallet. error: \(error.localizedDescription)")
        }
    }

}
