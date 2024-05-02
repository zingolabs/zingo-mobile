//
//  ZingoMobileTest.swift
//  ZingoMobileTests
//
//  Created by Juan Carlos Carmona Calvo on 5/2/24.
//

import Foundation
import UIKit
import XCTest

import React
import RPCModule

let TIMEOUT_SECONDS = 600
let TEXT_TO_LOOK_FOR = "Welcome to React"

class ZingoMobileTests: XCTestCase {

    func findSubview(in view: UIView, matching test: (UIView) -> Bool) -> Bool {
        if test(view) {
            return true
        }
        for subview in view.subviews {
            if findSubview(in: subview, matching: test) {
                return true
            }
        }
        return false
    }

    func testRendersWelcomeScreen() {
        guard let vc = UIApplication.shared.delegate?.window??.rootViewController else {
            XCTFail("Failed to access root view controller")
            return
        }
        var date = Date(timeIntervalSinceNow: TimeInterval(TIMEOUT_SECONDS))
        var foundElement = false
        var redboxError: String?

        #if DEBUG
        RCTSetLogFunction { level, source, fileName, lineNumber, message in
            if level.rawValue >= RCTLogLevelError.rawValue {
                redboxError = message
            }
        }
        #endif

        while date.timeIntervalSinceNow > 0 && !foundElement && redboxError == nil {
            RunLoop.main.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
            RunLoop.main.run(mode: .common, before: Date(timeIntervalSinceNow: 0.1))

            foundElement = findSubview(in: vc.view) { view in
                return view.accessibilityLabel == TEXT_TO_LOOK_FOR
            }
        }

        #if DEBUG
        RCTSetLogFunction(RCTDefaultLogFunction)
        #endif

        XCTAssertNil(redboxError, "RedBox error: \(redboxError ?? "")")
        XCTAssertTrue(foundElement, "Couldn't find element with text '\(TEXT_TO_LOOK_FOR)' in \(TIMEOUT_SECONDS) seconds")
    }

    func testCorruptWalletBug_ServerOKNewWallet() {
        let rpcmodule = RPCModule()

        // delete the wallet file, clean scenario
        let delete = rpcmodule.deleteExistingWallet()
        NSLog("Test Delete Wallet Cleaning \(delete)")

        // server OK
        let serverOK = "https://mainnet.lightwalletd.com:9067"
        let chainhint = "main"
        // create a new wallet
        let newWalletOK = rpcmodule.createNewWallet(serverOK: serverOK, chainhint: chainhint)
        NSLog("Test create New Wallet OK \(newWalletOK)")
        XCTAssertFalse(newWalletOK.hasPrefix("Error"), "Create New Wallet fails \(newWalletOK)")

        // save the wallet in internal storage
        rpcmodule.saveWalletInternal()

        // load wallet from file
        let loadWalletOK = rpcmodule.loadExistingWallet(serverOK: serverOK, chainhint: chainhint)
        NSLog("Test Load Wallet OK \(loadWalletOK)")
        XCTAssertFalse(loadWalletOK.hasPrefix("Error"), "Load Wallet from file fails \(loadWalletOK)")

        // delete the wallet file
        let deleteOK = rpcmodule.deleteExistingWallet()
        NSLog("Test Delete Wallet OK \(deleteOK)")
    }

    func testCorruptWalletBug_ServerKONewWallet() {
        let rpcmodule = RPCModule()

        // delete the wallet file, clean scenario
        let delete = rpcmodule.deleteExistingWallet()
        NSLog("Test Delete Wallet Cleaning \(delete)")

        // server KO
        let serverKO = "https://zuul.free2z.cash:9067"
        let serverOK = "https://mainnet.lightwalletd.com:9067"
        let chainhint = "main"
        // create a new wallet, expecting ERROR.
        let newWalletKO = rpcmodule.createNewWallet(serverOK: serverKO, chainhint: chainhint)
        NSLog("Test create New Wallet KO \(newWalletKO)")
        XCTAssertTrue(newWalletKO.hasPrefix("Error"), "Create New Wallet NOT fails, and it have to \(newWalletKO)")

        // save wallet in internal storage
        rpcmodule.saveWalletInternal()

        // load wallet from file, expecting ERROR.
        let loadWalletKO = rpcmodule.loadExistingWallet(serverOK: serverKO, chainhint: chainhint)
        NSLog("Test create Load Wallet KO \(loadWalletKO)")
        XCTAssertTrue(newWalletKO.hasPrefix("Error"), "Load Wallet from file NOT fails, and it have to \(newWalletKO)")

        // load wallet from file, expecting CORRUPT WALLET BUG.
        let loadWalletOK = rpcmodule.loadExistingWallet(serverOK: serverOK, chainhint: chainhint)
        NSLog("Test create Load Wallet KO \(loadWalletOK)")
        XCTAssertFalse(loadWalletOK.hasPrefix("Error"), "Load Wallet from file fails \(loadWalletOK)")

        // delete the wallet file
        let deleteKO = rpcmodule.deleteExistingWallet()
        NSLog("Test Delete Wallet OK \(deleteKO)")
    }
}
