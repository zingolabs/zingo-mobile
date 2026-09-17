//
//  ZingoTest.swift
//  ZingoTests
//
//  Created by Juan Carlos Carmona Calvo on 5/2/24.
//

import Foundation
import UIKit

import React
import XCTest
import ZingoFfi

enum Seeds {
    static let HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

/// The rejection contract of the host module: a LoadError rejects under
/// its case name with its detail, and any other error rejects under "Host".
class HostOutcomeTests: XCTestCase {
    private let loadFailures: [(error: LoadError, code: String)] = [
        (LoadError.Unreadable(detail: "boom"), "Unreadable"),
        (LoadError.InvalidInput(detail: "boom"), "InvalidInput"),
        (LoadError.Save(detail: "boom"), "Save"),
        (LoadError.Panic(detail: "boom"), "Panic"),
        (LoadError.Poisoned(detail: "boom"), "Poisoned"),
        (LoadError.Busy(detail: "boom"), "Busy"),
        (LoadError.Internal(detail: "boom"), "Internal"),
    ]

    /// Tests that a returned value resolves verbatim when the call returns,
    /// even when the value wears the historical error sentinel.
    func testAReturnedValueResolvesVerbatimWhenTheCallReturns() async {
        let proseLikeData = "Error: looks like prose but is legitimate data"

        guard case .resolved(let value) = await HostOutcome.of({ proseLikeData }) else {
            return XCTFail("A returning call must resolve")
        }
        XCTAssertEqual(value as? String, proseLikeData)
    }

    /// Tests that a LoadError rejects under its case name and detail when the call throws it.
    func testALoadErrorRejectsUnderItsCaseNameWhenTheCallThrowsIt() async {
        for (failure, expectedCode) in loadFailures {
            guard case .rejected(let code, let message, let error) = await HostOutcome.of({ throw failure }) else {
                return XCTFail("Case \(expectedCode) must reject on a thrown error")
            }
            XCTAssertEqual(code, expectedCode)
            XCTAssertEqual(message, "boom")
            XCTAssertTrue(error is LoadError)
        }
    }

    /// Tests that the classification of a LoadError is the same when settled through `of` and when called directly.
    func testClassifyNamesEveryLoadErrorCaseWhenGivenOne() {
        for (failure, expectedCode) in loadFailures {
            let (code, message) = HostOutcome.classify(failure)
            XCTAssertEqual(code, expectedCode)
            XCTAssertEqual(message, "boom")
        }
    }

    /// Tests that any other error rejects under "Host" with its description when the call throws it.
    func testAnyOtherErrorRejectsUnderHostWhenTheCallThrowsIt() async {
        struct Boom: Error, CustomStringConvertible {
            var description: String { "boom" }
        }
        guard case .rejected(let code, let message, let error) = await HostOutcome.of({ throw Boom() }) else {
            return XCTFail("A non-load error must still reject")
        }
        XCTAssertEqual(code, "Host")
        XCTAssertEqual(message, "boom")
        XCTAssertTrue(error is Boom)
    }

    /// Tests that a missing wallet rejects under "Host" when a save finds no open wallet.
    func testAMissingWalletRejectsUnderHostWhenTheSaveFindsNone() async {
        guard case .rejected(let code, let message, _) = await HostOutcome.of({ throw HostError.noOpenWallet }) else {
            return XCTFail("A missing wallet must reject")
        }
        XCTAssertEqual(code, "Host")
        XCTAssertEqual(message, "no wallet is open")
    }
}

/// The connection the host module builds from the load arguments.
class HostConnectionTests: XCTestCase {
    /// Tests that an empty server URI becomes an offline connection when the wallet loads.
    func testAnEmptyServerUriMeansOfflineWhenTheWalletLoads() throws {
        let connection = try Connection(
            serverUri: "", chain: "main", performanceLevel: "Medium", minConfirmations: 3)
        XCTAssertNil(connection.serverUri)
        XCTAssertEqual(connection.chain, .main)
        XCTAssertNil(connection.regtestSchedule)
        XCTAssertEqual(connection.performance, .medium)
        XCTAssertEqual(connection.minConfirmations, 3)
    }

    /// Tests that the regtest schedule splits off the chain word when the chain reads "regtest:<schedule>".
    func testARegtestScheduleSplitsOffWhenTheChainCarriesOne() throws {
        let connection = try Connection(
            serverUri: "http://127.0.0.1:20000", chain: "regtest:nu5=1,nu6=2",
            performanceLevel: "high", minConfirmations: 1)
        XCTAssertEqual(connection.serverUri, "http://127.0.0.1:20000")
        XCTAssertEqual(connection.chain, .regtest)
        XCTAssertEqual(connection.regtestSchedule, "nu5=1,nu6=2")
        XCTAssertEqual(connection.performance, .high)
    }

    /// Tests that an unknown chain word throws InvalidInput when the wallet loads.
    func testAnUnknownChainThrowsInvalidInputWhenTheWalletLoads() {
        XCTAssertThrowsError(
            try Connection(serverUri: "", chain: "moon", performanceLevel: "Medium", minConfirmations: 1)
        ) { error in
            guard case LoadError.InvalidInput = error else {
                return XCTFail("expected InvalidInput, got \(error)")
            }
        }
    }
}

/// The startup attribute migration: wallet files an old build wrote under
/// class A move to class C with backup exclusion, content untouched.
class WalletFileProtectionTests: XCTestCase {
    func testClassAFileMovesToClassCWithBackupExclusion() throws {
        let rpc = RPCModule()
        let fm = FileManager.default
        try fm.createDirectory(
            atPath: rpc.getDocumentsDirectory(),
            withIntermediateDirectories: true
        )
        let path = try rpc.getFileName(Constants.WalletFileName.rawValue)
        try "d2FsbGV0".write(toFile: path, atomically: true, encoding: .utf8)
        defer { try? fm.removeItem(atPath: path) }
        try fm.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: path)
        let stored = try fm.attributesOfItem(atPath: path)[.protectionKey] as? FileProtectionType

        rpc.applyWalletFileProtection()

        XCTAssertEqual(try String(contentsOfFile: path, encoding: .utf8), "d2FsbGV0")
        let excluded = try URL(fileURLWithPath: path)
            .resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
        XCTAssertEqual(excluded, true)
        guard stored == .complete else {
            throw XCTSkip("this simulator does not store file-protection attributes")
        }
        let after = try fm.attributesOfItem(atPath: path)[.protectionKey] as? FileProtectionType
        XCTAssertEqual(after, .completeUntilFirstUserAuthentication)
    }

    func testMissingWalletFilesAreANoOp() throws {
        let rpc = RPCModule()
        let fm = FileManager.default
        for name in [Constants.WalletFileName.rawValue, Constants.WalletBackupFileName.rawValue] {
            if let path = try? rpc.getFileName(name) {
                try? fm.removeItem(atPath: path)
            }
        }
        rpc.applyWalletFileProtection()
    }
}

/// The migration from the legacy base64 text format to raw wallet bytes.
class WalletFileMigrationTests: XCTestCase {
    private func mainPath(_ rpc: RPCModule) throws -> String {
        try FileManager.default.createDirectory(
            atPath: rpc.getDocumentsDirectory(),
            withIntermediateDirectories: true
        )
        return try rpc.getFileName(Constants.WalletFileName.rawValue)
    }

    override func tearDown() {
        let rpc = RPCModule()
        if let path = try? rpc.getFileName(Constants.WalletFileName.rawValue) {
            try? FileManager.default.removeItem(atPath: path)
        }
        super.tearDown()
    }

    private func walletBytes() -> Data {
        var wallet = Data([42, 0, 0, 0, 0, 0, 0, 0])
        wallet.append(Data(repeating: 7, count: 64))
        return wallet
    }

    /// Tests that a legacy text file migrates to raw bytes when it is read.
    func testALegacyTextFileMigratesToRawBytesOnRead() async throws {
        try? installCryptoProvider()
        let offline = Connection(
            serverUri: nil, chain: .main, regtestSchedule: nil, performance: .medium, minConfirmations: 1)
        let opened = try await Wallet.openFromSeed(
            connection: offline, seedPhrase: Seeds.HOSPITAL, birthday: 2_000_000)
        let saved = try await opened.saveWalletBytes()
        let wallet = try XCTUnwrap(saved)

        let rpc = RPCModule()
        let path = try mainPath(rpc)
        try wallet.base64EncodedString().write(
            toFile: path, atomically: true, encoding: .utf8)

        XCTAssertEqual(try rpc.readWalletBytes(), wallet)
        XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: path)), wallet)
    }

    func testAnInvalidLegacyTextFileFailsAndLeavesTheFileUntouched() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        let text = walletBytes().base64EncodedString()
        try text.write(toFile: path, atomically: true, encoding: .utf8)

        XCTAssertThrowsError(try rpc.readWalletBytes())
        XCTAssertEqual(
            try Data(contentsOf: URL(fileURLWithPath: path)),
            text.data(using: .utf8))
    }
}

/// The wallet and backup swap recovered from every interruption window,
/// and the delete purge of sidecar copies.
class WalletSwapRecoveryTests: XCTestCase {
    let walletA = "walletA"
    let walletB = "walletB"
    let walletC = "walletC"

    override func tearDown() {
        let rpc = RPCModule()
        let fm = FileManager.default
        for name in [Constants.WalletFileName.rawValue,
                     Constants.WalletBackupFileName.rawValue,
                     Constants.WalletTempSwapFileName.rawValue,
                     "\(Constants.WalletFileName.rawValue).broken"] {
            if let path = try? rpc.getFileName(name) {
                try? fm.removeItem(atPath: path)
            }
        }
        RPCModule.walletFileClosed = false
        super.tearDown()
    }

    /// Tests that the save leaves the file untouched when a delete or restore closed it.
    func testAClosedWalletFileRefusesTheSave() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.main, atomically: true, encoding: .utf8)

        RPCModule.walletFileClosed = true
        try rpc.saveWalletInternal(Data(walletB.utf8))

        XCTAssertEqual(try read(files.main), walletA)
    }

    func testDeleteClosesTheWalletFile() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        RPCModule.walletFileClosed = false
        try walletA.write(toFile: files.main, atomically: true, encoding: .utf8)

        try rpc.fnDeleteExistingWallet()

        XCTAssertTrue(RPCModule.walletFileClosed)
    }

    private func paths(_ rpc: RPCModule) throws -> (main: String, backup: String, temp: String) {
        try FileManager.default.createDirectory(
            atPath: rpc.getDocumentsDirectory(),
            withIntermediateDirectories: true
        )
        return (
            try rpc.getFileName(Constants.WalletFileName.rawValue),
            try rpc.getFileName(Constants.WalletBackupFileName.rawValue),
            try rpc.getFileName(Constants.WalletTempSwapFileName.rawValue)
        )
    }

    private func clear(_ files: (main: String, backup: String, temp: String)) {
        let fm = FileManager.default
        for path in [files.main, files.backup, files.temp] {
            try? fm.removeItem(atPath: path)
        }
    }

    private func read(_ path: String) throws -> String {
        try String(contentsOfFile: path, encoding: .utf8)
    }

    func testInterruptedBeforeMainRenameFinishesTheSwap() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.temp, atomically: true, encoding: .utf8)
        try walletB.write(toFile: files.backup, atomically: true, encoding: .utf8)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
        clear(files)
    }

    func testInterruptedBeforeBackupRenameFinishesTheSwap() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.temp, atomically: true, encoding: .utf8)
        try walletB.write(toFile: files.main, atomically: true, encoding: .utf8)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
        clear(files)
    }

    func testASaveRecreatingMainFinishesTheSwap() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.temp, atomically: true, encoding: .utf8)
        try walletA.write(toFile: files.main, atomically: true, encoding: .utf8)
        try walletB.write(toFile: files.backup, atomically: true, encoding: .utf8)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
        clear(files)
    }

    func testACompletedSwapDropsTheTemp() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.temp, atomically: true, encoding: .utf8)
        try walletB.write(toFile: files.main, atomically: true, encoding: .utf8)
        try walletA.write(toFile: files.backup, atomically: true, encoding: .utf8)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
        clear(files)
    }

    func testThreeDistinctWalletFilesAreLeftUntouched() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.temp, atomically: true, encoding: .utf8)
        try walletC.write(toFile: files.main, atomically: true, encoding: .utf8)
        try walletB.write(toFile: files.backup, atomically: true, encoding: .utf8)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletC)
        XCTAssertEqual(try read(files.backup), walletB)
        XCTAssertEqual(try read(files.temp), walletA)
    }

    func testDeleteKeepsAnUnresolvedSwapTemp() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.temp, atomically: true, encoding: .utf8)
        try walletC.write(toFile: files.main, atomically: true, encoding: .utf8)
        try walletB.write(toFile: files.backup, atomically: true, encoding: .utf8)

        try rpc.fnDeleteExistingWallet()

        XCTAssertFalse(FileManager.default.fileExists(atPath: files.main))
        XCTAssertEqual(try read(files.temp), walletA)
        XCTAssertEqual(try read(files.backup), walletB)
    }

    func testDeleteRemovesTheBrokenCopyAndTheSwapTemp() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        let brokenPath = try rpc.getFileName("\(Constants.WalletFileName.rawValue).broken")
        try? FileManager.default.removeItem(atPath: brokenPath)
        try walletA.write(toFile: files.main, atomically: true, encoding: .utf8)
        try walletA.write(toFile: brokenPath, atomically: true, encoding: .utf8)
        try walletA.write(toFile: files.temp, atomically: true, encoding: .utf8)

        try rpc.fnDeleteExistingWallet()

        let fm = FileManager.default
        XCTAssertFalse(fm.fileExists(atPath: files.main))
        XCTAssertFalse(fm.fileExists(atPath: brokenPath))
        XCTAssertFalse(fm.fileExists(atPath: files.temp))
        clear(files)
    }
}
