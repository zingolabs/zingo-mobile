//
//  ZingoMobileTest.swift
//  ZingoMobileTests
//
//  Created by Juan Carlos Carmona Calvo on 5/2/24.
//

import Foundation
import UIKit

import React
import XCTest

let TIMEOUT_SECONDS = 60
let TEXT_TO_LOOK_FOR = "Zingo"

class ZingoMobileTests: XCTestCase {
  
  private let errorPrefix = "error"

  func testCorruptWalletBug_ServerOKNewWallet() throws {
    let rpcmodule = RPCModule()
    
    let _ = setCryptoDefaultProviderToRing()

    // delete the wallet file, clean scenario
    do {
      try rpcmodule.fnDeleteExistingWallet()
      NSLog("1 - Test Delete Wallet Cleaning")
    } catch {
      NSLog("1 - Test Delete Wallet Cleaning - No wallet file")
    }

    // server OK
    let serverOK = "https://zec.rocks:443"
    let chainhint = "main"
    // create a new wallet
    let newWalletOK = try rpcmodule.fnCreateNewWallet(serveruri: serverOK, chainhint: chainhint, performancelevel: "Medium", minconfirmations: "1")
    NSLog("1 - Test create New Wallet OK \(newWalletOK)")
    XCTAssertFalse(newWalletOK.lowercased().hasPrefix(errorPrefix), "1 - Create New Wallet fails \(newWalletOK)")

    // load wallet from file
    let loadWalletOK = try rpcmodule.fnLoadExistingWallet(serveruri: serverOK, chainhint: chainhint, performancelevel: "Medium", minconfirmations: "3")
    NSLog("1 - Test Load Wallet OK \(loadWalletOK)")
    XCTAssertFalse(loadWalletOK.lowercased().hasPrefix(errorPrefix), "1 - Load Wallet from file fails \(loadWalletOK)")

    // delete the wallet file
    try rpcmodule.fnDeleteExistingWallet()
    NSLog("1 - Test Delete Wallet OK")
  }

  func testCorruptWalletBug_ServerKONewWallet() throws {
    let rpcmodule = RPCModule()
    
    let _ = setCryptoDefaultProviderToRing()

    // delete the wallet file, clean scenario
    do {
      try rpcmodule.fnDeleteExistingWallet()
      NSLog("2 - Test Delete Wallet Cleaning")
    } catch {
      NSLog("2 - Test Delete Wallet Cleaning - No wallet file")
    }

    // server KO
    let serverKO = "https://zuul.free2z.cash:9067"
    let serverOK = "https://zec.rocks:443"
    let chainhint = "main"
    // create a new wallet, expecting ERROR.
    let newWalletKO = try rpcmodule.fnCreateNewWallet(serveruri: serverKO, chainhint: chainhint, performancelevel: "Medium", minconfirmations: "1")
    NSLog("2 - Test create New Wallet KO \(newWalletKO)")
    XCTAssertTrue(newWalletKO.lowercased().hasPrefix(errorPrefix), "2 - Create New Wallet NOT fails, and it have to \(newWalletKO)")

    if (try rpcmodule.fileExists(Constants.WalletFileName.rawValue) == "true") {
      // load wallet from file, expecting ERROR.
      let loadWalletKO = try rpcmodule.fnLoadExistingWallet(serveruri: serverKO, chainhint: chainhint, performancelevel: "Medium", minconfirmations: "3")
      NSLog("2 - Test create Load Wallet KO \(loadWalletKO)")
      XCTAssertTrue(newWalletKO.lowercased().hasPrefix(errorPrefix), "2 - Load Wallet from file NOT fails, and it have to \(newWalletKO)")
      
      // load wallet from file, expecting CORRUPT WALLET BUG.
      let loadWalletOK = try rpcmodule.fnLoadExistingWallet(serveruri: serverOK, chainhint: chainhint, performancelevel: "Medium", minconfirmations: "3")
      NSLog("2 - Test create Load Wallet KO \(loadWalletOK)")
      XCTAssertFalse(loadWalletOK.lowercased().hasPrefix(errorPrefix), "2 - Load Wallet from file fails \(loadWalletOK)")
    } else {
      NSLog("2 - Test no wallet file, imposible to load by Server KO")
    }
    
    // delete the wallet file
    do {
      try rpcmodule.fnDeleteExistingWallet()
      NSLog("2 - Test Delete Wallet OK")
    } catch {
      NSLog("2 - Test Delete Wallet - No wallet file")
    }
  }
}
