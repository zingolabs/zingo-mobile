//
//  RPCModule.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React

@objc(RPCModuleSwift)
class RPCModuleSwift: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
      return true
  }
  
  @objc(resolve:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          //reject("1", "ENo se pudo encontrar el directorio de documentos", nil)
          return
      }

      let fileName = "\(documentsDirectory)/wallet.dat.txt"
      let fileExists = FileManager.default.fileExists(atPath: fileName)
      
      if fileExists {
          resolve("true")
      } else {
          resolve("false")
      }
  }
  
  
}
