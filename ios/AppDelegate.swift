//
//  AppDelegate.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/4/24.
//

import Foundation
import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  private let bcgTaskId = "Zingo_Processing_Task_ID"
  private let bcgSchedulerTaskId = "Zingo_Processing_Scheduler_Task_ID"
  private var monitor: NWPathMonitor?
  private let workerQueue = DispatchQueue(label: "Monitor")
  private var isConnectedToWifi = false
  private var window: UIWindow?
  private var bridge: RCTBridge!
  private var bgTask: BGProcessingTask? = nil
  private var timeStampStrStart: NSString? = nil


  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let jsCodeLocation: URL

    jsCodeLocation = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index", fallbackExtension: nil)
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
        self.stopSyncingProcess(nil)

        // cancel bg task
        if let bgTask = bgTask as? BGTask {
            NSLog("BGTask foreground - sync task CANCEL")
            bgTask.setTaskCompleted(success: false)
        }
        bgTask = nil
    }
  }

  func applicationDidEnterBackground(_ application: UIApplication) {
    if #available(iOS 13.0, *) {
        // Cancel existing sync process (if any).
        NSLog("BGTask background")
        self.stopSyncingProcess(nil)

        // Cancel bg task
        if let bgTask = bgTask as? BGTask {
            NSLog("BGTask background - sync task CANCEL")
            bgTask.setTaskCompleted(success: false)
        }
        bgTask = nil

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
            LoggerProxy.event("BGTask isConnectedToWifi \(path.status == .satisfied)")
        }
        monitor?.start(queue: workerQueue)
        
        registerTasks()
    }
    
    private func registerTasks() {
        let bcgSyncTaskResult = BGTaskScheduler.shared.register(
            forTaskWithIdentifier: bcgTaskId,
            using: DispatchQueue.main
        ) { [self] task in
            LoggerProxy.event("BGTask BGTaskScheduler.shared.register SYNC called")
            guard let task = task as? BGProcessingTask else {
                return
            }
            
            NSLog("BGTask BGTaskScheduler.shared.register SYNC called")
            self.bgTask = bgTask
            self.startBackgroundTask(nil)
        }

        LoggerProxy.event("BGTask SYNC registered \(bcgSyncTaskResult)")

        let bcgSchedulerTaskResult = BGTaskScheduler.shared.register(
            forTaskWithIdentifier: bcgSchedulerTaskId,
            using: DispatchQueue.main
        ) { [self] task in
            LoggerProxy.event("BGTask BGTaskScheduler.shared.register SCHEDULER called")
            guard let task = task as? BGProcessingTask else {
                return
            }

            scheduleSchedulerBackgroundTask()
            scheduleBackgroundTask()
            
            task.setTaskCompleted(success: true)
        }
        
        LoggerProxy.event("BGTask SCHEDULER registered \(bcgSchedulerTaskResult)")
    }
    
    private func startBackgroundTask(_ task: BGProcessingTask) {
        LoggerProxy.event("BGTask startBackgroundTask called")
        
        // schedule tasks for the next time
        scheduleBackgroundTask()
        scheduleSchedulerBackgroundTask()

        guard isConnectedToWifi else {
            LoggerProxy.event("BGTask startBackgroundTask: not connected to the wifi")
            task.setTaskCompleted(success: false)
            return
        }
        
        // Iniciar la sincronización
        NSLog("BGTask startBackgroundTask run sync task")
        // Para ejecutar solo una tarea
        DispatchQueue.global(qos: .background).async {
            self.syncingProcessBackgroundTask(nil)
        }

        
        task.expirationHandler = {
            NSLog("BGTask startBackgroundTask - expirationHandler called")
            // Interrumpir el proceso de sincronización, no puedo esperar a ver si el proceso ha terminado
            // porque no tengo suficiente tiempo para ejecutar todo lo que necesito en esta tarea.
            if let interrupt = execute("interrupt_sync_after_batch", "true") {
                let interruptStr = String(cString: interrupt)
                NSLog("BGTask startBackgroundTask - expirationHandler interrupt syncing \(interruptStr)")
            }

            let rpcmodule = RPCModule()

            // Guardar la billetera
            rpcmodule.saveWalletInternal()
            NSLog("BGTask startBackgroundTask - expirationHandler Save Wallet")

            // Guardar información en JSON de fondo
            let timeStamp = Date().timeIntervalSince1970
            let timeStampStr = String(format: "%.0f", timeStamp)
            let jsonBackground = "{\"batches\": \"0\", \"message\": \"Expiration fired. Finished OK.\", \"date\": \"\(timeStampStrStart)\", \"dateEnd\": \"\(timeStampStr)\"}"
            rpcmodule.saveBackgroundFile(jsonBackground)
            NSLog("BGTask startBackgroundTask - expirationHandler Save background JSON \(jsonBackground)")

            bgTask.setTaskCompleted(success: false)
            bgTask = nil
            NSLog("BGTask startBackgroundTask - expirationHandler THE END")
        }

    }
    
    func scheduleBackgroundTask() {
        // This method can be called as many times as needed, the previously submitted
        // request will be overridden by the new one.
        LoggerProxy.event("BGTask scheduleBackgroundTask called")
        
        let request = BGProcessingTaskRequest(identifier: bcgTaskId)
        
        let today = Calendar.current.startOfDay(for: .now)
        guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else {
            LoggerProxy.event("BGTask scheduleBackgroundTask failed to schedule time")
            return
        }
        
        let earlyMorningComponent = DateComponents(hour: 3, minute: Int.random(in: 0...60))
        let earlyMorning = Calendar.current.date(byAdding: earlyMorningComponent, to: tomorrow)
        request.earliestBeginDate = earlyMorning
        request.requiresExternalPower = true
        request.requiresNetworkConnectivity = true
        
        do {
            try BGTaskScheduler.shared.submit(request)
            LoggerProxy.event("BGTask scheduleBackgroundTask succeeded to submit")
        } catch {
            LoggerProxy.event("BGTask scheduleBackgroundTask failed to submit, error: \(error)")
        }
    }
    
    func scheduleSchedulerBackgroundTask() {
        // This method can be called as many times as needed, the previously submitted
        // request will be overridden by the new one.
        LoggerProxy.event("BGTask scheduleSchedulerBackgroundTask called")
        
        let request = BGProcessingTaskRequest(identifier: bcgSchedulerTaskId)
        
        let today = Calendar.current.startOfDay(for: .now)
        guard let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) else {
            LoggerProxy.event("BGTask scheduleSchedulerBackgroundTask failed to schedule time")
            return
        }
        
        let afternoonComponent = DateComponents(hour: 14, minute: Int.random(in: 0...60))
        let afternoon = Calendar.current.date(byAdding: afternoonComponent, to: tomorrow)
        request.earliestBeginDate = afternoon
        request.requiresExternalPower = false
        request.requiresNetworkConnectivity = false
        
        do {
            try BGTaskScheduler.shared.submit(request)
            LoggerProxy.event("BGTask scheduleSchedulerBackgroundTask succeeded to submit")
        } catch {
            LoggerProxy.event("BGTask scheduleSchedulerBackgroundTask failed to submit, error: \(error)")
        }
    }

    func stopSyncingProcess(_ noValue: String?) {
      autoreleasepool {
        NSLog("BGTask stopSyncingProcess")
        guard let status = execute("syncstatus", "") else {
            NSLog("BGTask stopSyncingProcess - no lightwalled likely")
            return
        }
        let statusStr = String(cString: status)
        rust_free(status)

        NSLog("BGTask stopSyncingProcess - status response \(statusStr)")

        guard let data = statusStr.data(using: .utf8),
              let jsonResp = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
              let inProgressStr = jsonResp["in_progress"] as? String,
              let inProgress = Bool(inProgressStr) else {
            NSLog("BGTask stopSyncingProcess - error parsing JSON response")
            return
        }

        while inProgress {
            guard let interrupt = execute("interrupt_sync_after_batch", "true") else {
                NSLog("BGTask stopSyncingProcess - error interrupting syncing")
                return
            }
            let interruptStr = String(cString: interrupt)
            NSLog("BGTask stopSyncingProcess - interrupt syncing \(interruptStr)")

            Thread.sleep(forTimeInterval: 0.5)

            guard let newStatus = execute("syncstatus", "") else {
                NSLog("BGTask stopSyncingProcess - error getting new status")
                return
            }
            let newStatusStr = String(cString: newStatus)
            rust_free(newStatus)
            NSLog("BGTask stopSyncingProcess - status response \(newStatusStr)")

            guard let newData = newStatusStr.data(using: .utf8),
                  let newJsonResp = try? JSONSerialization.jsonObject(with: newData, options: []) as? [String: Any],
                  let newInProgressStr = newJsonResp["in_progress"] as? String,
                  let newInProgress = Bool(newInProgressStr) else {
                NSLog("BGTask stopSyncingProcess - error parsing new JSON response")
                return
            }

            inProgress = newInProgress
        }

        NSLog("BGTask stopSyncingProcess - syncing process STOPPED")
      }
    }

    func syncingProcessBackgroundTask(_ noValue: String?) {
      autoreleasepool {
        let rpcmodule = RPCModule()

        // Guardar información en JSON de fondo
        let timeStampStart = Date().timeIntervalSince1970
        let timeStampStrStart = String(format: "%.0f", timeStampStart)
        let jsonBackgroundStart = "{\"batches\": \"0\", \"message\": \"Starting OK.\", \"date\": \"\(timeStampStrStart)\", \"dateEnd\": \"0\"}"
        rpcmodule.saveBackgroundFile(jsonBackgroundStart)
        NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundStart)")

        NSLog("BGTask syncingProcessBackgroundTask")
        let exists = self.wallet__exists()

        if exists {
            // Verificar si el servidor está activo
            let balance = execute("balance", "")
            let balanceStr = String(cString: balance)
            NSLog("BGTask syncingProcessBackgroundTask - testing if server is active \(balanceStr)")
            rust_free(balance)
            if balanceStr.hasPrefix("Error") {
                // La tarea se está ejecutando con la aplicación cerrada
                self.loadWalletFile(nil)
            } else {
                // La aplicación está abierta, detener la sincronización por si acaso.
                self.stopSyncingProcess(nil)
            }

            // Ejecutar la sincronización sin interrupciones
            let noInterrupt = execute("interrupt_sync_after_batch", "false")
            let noInterruptStr = String(cString: noInterrupt)
            NSLog("BGTask syncingProcessBackgroundTask - no interrupt syncing \(noInterruptStr)")
            rust_free(noInterrupt)

            // Ejecutar la sincronización
            NSLog("BGTask syncingProcessBackgroundTask - sync BEGIN")
            let syncing = execute("sync", "")
            let syncingStr = String(cString: syncing)
            rust_free(syncing)
            NSLog("BGTask syncingProcessBackgroundTask - sync END \(syncingStr)")

        } else {
            // No existe el archivo de billetera
            NSLog("BGTask syncingProcessBackgroundTask - No exists wallet file END")

            // Guardar información en JSON de fondo
            let timeStampError = Date().timeIntervalSince1970
            let timeStampStrError = String(format: "%.0f", timeStampError)
            let jsonBackgroundError = "{\"batches\": \"0\", \"message\": \"No active wallet KO.\", \"date\": \"\(timeStampStrStart)\", \"dateEnd\": \"\(timeStampStrError)\"}"
            rpcmodule.saveBackgroundFile(jsonBackgroundError)
            NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundError)")

            bgTask?.setTaskCompleted(success: false)
            bgTask = nil
            return
        }

        NSLog("BGTask syncingProcessBackgroundTask - syncing task STOPPED")

        // Guardar la billetera
        rpcmodule.saveWalletInternal()
        NSLog("BGTask syncingProcessBackgroundTask - Save Wallet")

        // Guardar información en JSON de fondo
        let timeStampEnd = Date().timeIntervalSince1970
        let timeStampStrEnd = String(format: "%.0f", timeStampEnd)
        let jsonBackgroundEnd = "{\"batches\": \"0\", \"message\": \"Finished OK.\", \"date\": \"\(timeStampStrStart)\", \"dateEnd\": \"\(timeStampStrEnd)\"}"
        rpcmodule.saveBackgroundFile(jsonBackgroundEnd)
        NSLog("BGTask syncingProcessBackgroundTask - Save background JSON \(jsonBackgroundEnd)")

        bgTask?.setTaskCompleted(success: true)
        bgTask = nil
      }
    }

    func loadWalletFile(_ noValue: String?) {
      autoreleasepool {
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
        rpcmodule.loadExistingWallet(serverURI: serverURI, chainhint: chainhint)
      }
    }

    func walletExists() -> Bool {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
        return false
      }

      // Escribir en el directorio de documentos de la aplicación del usuario
      let fileName = "\(documentsDirectory)/wallet.dat.txt"
      return FileManager.default.fileExists(atPath: fileName)
    }

}
