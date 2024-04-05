//
//  RPCModule.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React

@objc(RPCModule)
class RPCModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
      return true
  }
  
  @objc(walletExists:rejecter:)
  func walletExists(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        let fileExists = FileManager.default.fileExists(atPath: fileName)
        if fileExists {
            resolve("true")
        } else {
            resolve("false")
        }
      } else {
        resolve("false")
      }
  }

  @objc(walletBackupExists:rejecter:)
  func walletBackupExists(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
        let fileExists = FileManager.default.fileExists(atPath: fileName)
        if fileExists {
            resolve("true")
        } else {
            resolve("false")
        }
      } else {
        resolve("false")
      }
  }

  func saveWalletFile(_ data: String) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        do {
            try data.write(toFile: fileName, atomically: true, encoding: .utf8)
        } catch {
            NSLog("Error save wallet \(error.localizedDescription)")
        }
      } else {
        NSLog("Error save wallet")
      }
  }

  func saveWalletBackupFile(_ data: String) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
        do {
            try data.write(toFile: fileName, atomically: true, encoding: .utf8)
        } catch {
            NSLog("Error save backup wallet \(error.localizedDescription)")
        }
      } else {
        NSLog("Error save backup wallet")
      }
  }

  func saveBackgroundFile(_ data: String) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/background.json"
        do {
            try data.write(toFile: fileName, atomically: true, encoding: .utf8)
        } catch {
            NSLog("Error save background file \(error.localizedDescription)")
        }
      } else {
        NSLog("Error save background file")
      }
  }

  func readWallet() -> String? {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        do {
            let content = try String(contentsOfFile: fileName, encoding: .utf8)
            return content
        } catch {
            NSLog("Error reading wallet \(error.localizedDescription)")
            return nil
        }
      } else {
        NSLog("Error reading wallet")
        return nil
      }
  }

  func readWalletBackup() -> String? {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
        do {
            let content = try String(contentsOfFile: fileName, encoding: .utf8)
            return content
        } catch {
            print("Error reading backup wallet:", error.localizedDescription)
            return nil
        }
      } else {
        NSLog("Error reading backup wallet")
        return nil
      }
  }

  func deleteExistingWallet() -> Bool {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        do {
            try FileManager.default.removeItem(atPath: fileName)
            return true
        } catch {
            NSLog("Error deleting wallet \(error.localizedDescription)")
            return false
        }
      } else {
        NSLog("Error deleting wallet")
        return false
      }
  }

  @objc(deleteExistingWallet:rejecter:)
  func deleteExistingWallet(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      if deleteExistingWallet() {
          resolve("true")
      } else {
          resolve("false")
      }
  }

  @objc(deleteExistingWalletBackup:rejecter:)
  func deleteExistingWalletBackup(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
        do {
            try FileManager.default.removeItem(atPath: fileName)
            resolve("true")
        } catch {
            NSLog("Error deleting backup wallet \(error.localizedDescription)")
            resolve("false")
        }
      } else {
        NSLog("Error deleting backup wallet")
        resolve("false")
      }
  }

  func saveWalletInternal() {
      let walletDataStr = saveToB64()
      saveWalletFile(walletDataStr)
  }

  func saveWalletBackupInternal() {
      if let walletDataStr = readWallet() {
          saveWalletBackupFile(walletDataStr)
      } else {
          NSLog("Error: Unable to read wallet for backup")
      }
  }

  func createNewWallet(server: String, chainhint: String) -> String {
      autoreleasepool {
          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          if let documentsDirectory = paths.first {
            let seed = initNew(serveruri: server, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
            let seedStr = String(seed)
            if !seedStr.lowercased().hasPrefix("error") {
                saveWalletInternal()
            }
            return seedStr
          } else {
            NSLog("Error creating new wallet")
            return ""
          }
      }
  }

  @objc(createNewWallet:chainhinter:resolver:rejecter:)
  func createNewWallet(server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global().async {
          let seedStr = self.createNewWallet(server: server, chainhint: chainhint)
          resolve(seedStr)
      }
  }

  @objc(restoreWalletFromSeed:birthdayer:serverer:chainhinter:resolver:rejecter:)
  func restoreWalletFromSeed(restoreSeed: String, birthday: String, server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global().async {
          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          if let documentsDirectory = paths.first {
              let seed = initFromSeed(serveruri: server, seed: restoreSeed, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
              let seedStr = String(seed)
              if !seedStr.lowercased().hasPrefix("error") {
                self.saveWalletInternal()
              }
              resolve(seedStr)
          } else {
              NSLog("Error restoring wallet from seed")
              resolve("")
          }
      }
  }

  @objc(restoreWalletFromUfvk:birthdayer:serverer:chainhinter:resolver:rejecter:)
  func restoreWalletFromUfvk(restoreUfvk: String, birthday: String, server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global().async {
          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          if let documentsDirectory = paths.first {
              let ufvk = initFromUfvk(serveruri: server, ufvk: restoreUfvk, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
              let ufvkStr = String(ufvk)
              if !ufvkStr.lowercased().hasPrefix("error") {
                self.saveWalletInternal()
              }
              resolve(ufvkStr)
          } else {
              NSLog("Error restoring wallet from ufvk")
              resolve("")
          }
      }
  }

  func loadExistingWallet(server: String, chainhint: String) -> String {
      autoreleasepool {
          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          if let documentsDirectory = paths.first {
              if let walletDataStr = readWallet() {
                let seed = initFromB64(serveruri: server, datab64: walletDataStr, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
                let seedStr = String(seed)
                return seedStr
              } else {
                NSLog("Error loading existing wallet")
                return ""
              }
          } else {
              NSLog("Error loading existing wallet")
              return ""
          }
      }
  }

  @objc(loadExistingWallet:chainhinter:resolver:rejecter:)
  func loadExistingWallet(server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      autoreleasepool {
          let seedStr = self.loadExistingWallet(server: server, chainhint: chainhint)
          resolve(seedStr)
      }
  }

  @objc(restoreExistingWalletBackup:rejecter:)
  func restoreExistingWalletBackup(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      autoreleasepool {
          if let backupDataStr = self.readWalletBackup(),
             let walletDataStr = self.readWallet() {
            self.saveWalletFile(backupDataStr)
            self.saveWalletBackupFile(walletDataStr)
            resolve("true")
          } else {
            NSLog("Error restoring existing wallet backup")
            resolve("false")
          }
      }
  }

  @objc(doSave:rejecter:)
  func doSave(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      saveWalletInternal()
      resolve("true")
  }

  @objc(doSaveBackup:rejecter:)
  func doSaveBackup(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      saveWalletBackupInternal()
      resolve("true")
  }

  func doExecuteOnThread(_ dict: [String: Any]) {
      autoreleasepool {
          if let method = dict["method"] as? String,
             let args = dict["args"] as? String,
             let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            let resp = executeCommand(cmd: method, args: args)
            let respStr = String(resp)
            if method == "sync" && !respStr.lowercased().hasPrefix("error") {
                // Also save the wallet after sync
                saveWalletInternal()
            }
            resolve(respStr)
          } else {
            NSLog("Error executing a command")
            if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve("")
            }
          }
      }
  }

  @objc(execute:argser:resolver:rejecter:)
  func execute(method: String, args: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["method": method, "args": args, "resolve": resolve]
      DispatchQueue.global().async {
          self.doExecuteOnThread(dict)
      }
  }

  @objc(getLatestBlock:resolver:rejecter:)
  func getLatestBlock(server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
      DispatchQueue.global().async {
          self.getLatestBlockAsync(dict)
      }
  }

  func getLatestBlockAsync(_ dict: [AnyHashable: Any]) {
      if let server = dict["server"] as? String,
         let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        let resp = getLatestBlockServer(serveruri: server)
        let respStr = String(resp)
        resolve(respStr)
      } else {
        NSLog("Error getting latest block server")
        if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          resolve("")
        }
      }
  }

}
