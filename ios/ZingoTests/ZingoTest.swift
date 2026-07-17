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

enum Seeds {
    static let HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

enum UfvkConst {
    static let HOSPITAL = "uviewregtest1zd5hsn447739jr5pk879pn06wan8gewam949xjqvwgfc7zec29x2ezqyeq6vmtwkcmn0kkfl447caqsccg582dp50ax972dfm4eh5f4mqj730fgr7hygvjeqxlgpwynrmcu57fjjqlns95chfjfq4xg7v977x603un9fuw73zvn2t32pfcfewrh67tzv04wstjg0yx4r3lpmpaea9nsyll6juu9jtyc0fstdwde06l4tvzlerytyutfd3yptq5r5csfck9c5ks8rzaj5r9tgltarejfdxu8h79sxmc6knxtnglp0pa7y3kw708rueg984ty6lhyrlzmk2swyqqfe0q2nmzhcxme9rsvprcw50ms463twx4suldhm0p94lem8ryan4e4y8fpp8grr5kmlygm70h2zhl0d7mfra5qs78jq9wqctvk8fhdu9cv78q00v7qzl9w50j242xr0945pmsu2vrh6jcvq8fxad420m8kxpd3cgyd6wxy6"
}

struct InitFromSeed: Codable {
    let seed_phrase: String
    let birthday: UInt64
    let no_of_accounts: UInt64
}

struct InitFromUfvk: Codable {
    let ufvk: String
    let birthday: UInt64
}

struct ExportUfvk: Codable {
    let ufvk: String
    let birthday: UInt64
}

struct UnifiedAddress: Codable, Equatable {
    let account: UInt64?
    let address_index: UInt64?
    let has_orchard: Bool?
    let has_sapling: Bool?
    let has_transparent: Bool?
    let encoded_address: String?
    let error: String?
}

struct TransparentAddress: Codable, Equatable {
    let account: UInt64?
    let address_index: UInt64?
    let scope: String?
    let encoded_address: String?
    let error: String?
}

struct Info: Codable {
    let version: String
    let git_commit: String
    let server_uri: String
    let vendor: String
    let taddr_support: Bool
    let chain_name: String
    let sapling_activation_height: UInt64
    let consensus_branch_id: String
    let latest_block_height: UInt64
}

struct Height: Codable {
    let height: UInt64
}

struct ScanRanges: Codable {
    let priority: String
    let start_block: String
    let end_block: String
}

struct SyncStatus: Codable {
    let scan_ranges: [ScanRanges]?
    let sync_start_height: UInt64?
    let session_blocks_scanned: UInt64?
    let total_blocks_scanned: UInt64?
    let percentage_session_blocks_scanned: Double?
    let percentage_total_blocks_scanned: Double?
    let session_sapling_outputs_scanned: UInt64?
    let total_sapling_outputs_scanned: UInt64?
    let session_orchard_outputs_scanned: UInt64?
    let total_orchard_outputs_scanned: UInt64?
    let percentage_session_outputs_scanned: Double?
    let percentage_total_outputs_scanned: Double?
}

struct Balance: Codable {
    let totalIronwoodBalance: Int64
    let confirmedIronwoodBalance: Int64
    let unconfirmedIronwoodBalance: Int64
    let totalSaplingBalance: Int64
    let confirmedSaplingBalance: Int64
    let unconfirmedSaplingBalance: Int64
    let totalOrchardBalance: Int64
    let confirmedOrchardBalance: Int64
    let unconfirmedOrchardBalance: Int64
    let totalTransparentBalance: Int64
    let confirmedTransparentBalance: Int64
    let unconfirmedTransparentBalance: Int64

    // The FFI JSON speaks snake_case; the coding keys carry that contract so
    // the properties can follow the Swift naming the identifier_name lint
    // enforces.
    enum CodingKeys: String, CodingKey {
        case totalIronwoodBalance = "total_ironwood_balance"
        case confirmedIronwoodBalance = "confirmed_ironwood_balance"
        case unconfirmedIronwoodBalance = "unconfirmed_ironwood_balance"
        case totalSaplingBalance = "total_sapling_balance"
        case confirmedSaplingBalance = "confirmed_sapling_balance"
        case unconfirmedSaplingBalance = "unconfirmed_sapling_balance"
        case totalOrchardBalance = "total_orchard_balance"
        case confirmedOrchardBalance = "confirmed_orchard_balance"
        case unconfirmedOrchardBalance = "unconfirmed_orchard_balance"
        case totalTransparentBalance = "total_transparent_balance"
        case confirmedTransparentBalance = "confirmed_transparent_balance"
        case unconfirmedTransparentBalance = "unconfirmed_transparent_balance"
    }
}

struct SendResult: Codable {
    let address: String
    let amount: Int64
    let memo: String?
}

struct ValueTransfer: Codable, Equatable {
    let txid: String
    let datetime: Int64
    let status: String
    let blockheight: Int64
    let transactionFee: Int64?
    let zecPrice: Int64?
    let kind: String
    let value: Int64
    let recipientAddress: String?
    // zingolib feat/ironwood replaced the singular `pool_received` with
    // per-direction pool lists.
    let poolsSentFrom: [String]?
    let poolsReceived: [String]?
    let memos: [String]?

    // The FFI JSON speaks snake_case; the coding keys carry that contract so
    // the properties can follow the Swift naming the identifier_name lint
    // enforces.
    enum CodingKeys: String, CodingKey {
        case txid, datetime, status, blockheight, kind, value, memos
        case transactionFee = "transaction_fee"
        case zecPrice = "zec_price"
        case recipientAddress = "recipient_address"
        case poolsSentFrom = "pools_sent_from"
        case poolsReceived = "pools_received"
    }
}

struct ValueTransfers: Codable {
    let value_transfers: [ValueTransfer]
    let total: Int64
}

struct ParseResult: Codable, Equatable {
    let status: String
    let chain_name: String?
    let address_kind: String?
}

private func decodeJSON<T: Decodable>(_ json: String) throws -> T {
    let data = Data(json.utf8)
    let dec = JSONDecoder()
    return try dec.decode(T.self, from: data)
}

private func isError(_ s: String) -> Bool {
    return s.lowercased().hasPrefix("error")
}

private func setCryptoProvider() {
  do {
    _ = try setCryptoDefaultProviderToRing()
  } catch {
    XCTFail("\nCrypto provider default error:\n\(error.localizedDescription)")
    return
  }
}

private func waitForSyncOrFail(timeoutSeconds: TimeInterval = 120) {
    let t0 = Date()
    while Date().timeIntervalSince(t0) < timeoutSeconds {
        do {
            let statusJson = try statusSync()
            print("\nSync Status:\n\(statusJson)")
            if isError(statusJson) {
                XCTFail("\nSync status error:\n\(statusJson)")
                return
            }
            let data = statusJson.data(using: .utf8)!
            let syncStatus: SyncStatus = try JSONDecoder().decode(SyncStatus.self, from: data)

            let percent: Double =
              syncStatus.percentage_total_outputs_scanned
              ?? syncStatus.percentage_total_blocks_scanned
              ?? 0.0

            if percent >= 100.0 {
              return
            }
        } catch {
            XCTFail("\nSync status error:\n\(error.localizedDescription)")
            return
        }
        Thread.sleep(forTimeInterval: 1.0)
    }
    XCTFail("Sync timeout after \(timeoutSeconds) seconds")
}

/// Initializes the test wallet from a seed on regtest and pins the init
/// echo. Fails the test and returns false when init does not succeed, so
/// callers can guard on it.
private func initWalletFromSeed(serveruri: String, seed: String = Seeds.HOSPITAL) -> Bool {
    do {
        let initJson = try initFromSeed(
            seed: seed,
            birthday: UInt32(1),
            serveruri: serveruri,
            chainhint: "regtest",
            performancelevel: "Medium",
            minconfirmations: UInt32(1)
        )
        print("\nInit from seed:\n\(initJson)")
        let initRes: InitFromSeed = try decodeJSON(initJson)
        XCTAssertEqual(initRes.seed_phrase, seed)
        XCTAssertEqual(initRes.birthday, 1)
        return true
    } catch {
        XCTFail("\nInit from seed error:\n\(error.localizedDescription)")
        return false
    }
}

/// Fetches the connected lightwalletd's info and returns its latest block
/// height, which must be positive. Fails the test and returns nil on error,
/// so callers can guard on it.
private func latestBlockHeightOrFail() -> UInt64? {
    do {
        let infoJson = try infoServer()
        print("\nInfo:\n\(infoJson)")
        let info: Info = try decodeJSON(infoJson)
        XCTAssertGreaterThan(info.latest_block_height, UInt64.zero)
        return info.latest_block_height
    } catch {
        XCTFail("\nInfo error:\n\(error.localizedDescription)")
        return nil
    }
}

/// Launches a sync and waits for it to complete. A failed launch prints and
/// falls through to the wait, preserving the tests' historical tolerance: a
/// concurrent launch reports as status, and the poll below fails the test if
/// no sync is actually running.
private func syncAndWait() {
    do {
        let syncJson = try runSync()
        print("\nSync:\n\(syncJson)")
    } catch {
        print("\nSync error:\n\(error.localizedDescription)")
    }
    waitForSyncOrFail()
}

/// Pins the wallet's first unified and transparent addresses to the values
/// the HOSPITAL seed derives on regtest.
private func assertHospitalAddresses() {
    do {
        let addrsJson = try getUnifiedAddresses()
        print("\nAddresses:\n\(addrsJson)")
        let addrs: [UnifiedAddress] = try decodeJSON(addrsJson)
        XCTAssertEqual(
            addrs[0].encoded_address,
            "u1gsqvqxx6lmmqg05uvx57gjdg5j3a54nxw09z4vq4z0yp7dfdcjrqk5wq64quwzrufmujd5e8xu5jn7cyewjaptxc8lsqwa2lk559u4cd"
        )
        XCTAssertEqual(addrs[0].has_orchard, true)
        XCTAssertEqual(addrs[0].has_sapling, false)
        XCTAssertEqual(addrs[0].has_transparent, false)
    } catch {
        XCTFail("\nAddresses error:\n\(error.localizedDescription)")
        return
    }

    do {
        let tAddrsJson = try getTransparentAddresses()
        print("\nT Addresses:\n\(tAddrsJson)")
        let tAddrs: [TransparentAddress] = try decodeJSON(tAddrsJson)
        XCTAssertEqual(tAddrs[0].encoded_address, "t1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F")
        XCTAssertEqual(tAddrs[0].scope, "external")
    } catch {
        XCTFail("\nT Addresses error:\n\(error.localizedDescription)")
    }
}

final class ExecuteAddressesFromSeed: XCTestCase {
    func testExecuteAddressesFromSeed() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://127.0.0.1:20000") else { return }
        guard latestBlockHeightOrFail() != nil else { return }

        assertHospitalAddresses()
    }
}

final class ExecuteAddressFromUfvk: XCTestCase {
    func testExecuteAddressFromUfvk() throws {
        setCryptoProvider()

        let serveruri = "http://10.0.2.2:20000"
        let chainhint = "regtest"
        let ufvk = UfvkConst.HOSPITAL

        do {
          let initJson = try initFromUfvk(ufvk: ufvk, birthday: UInt32(1), serveruri: serveruri, chainhint: chainhint, performancelevel: "Medium", minconfirmations: UInt32(1))
          print("\nInit From UFVK:\n\(initJson)")
          let initRes: InitFromUfvk = try decodeJSON(initJson)
          XCTAssertEqual(initRes.ufvk, ufvk)
          XCTAssertEqual(initRes.birthday, 1)
        } catch {
          XCTFail("\nInit from UFVK error:\n\(error.localizedDescription)")
          return
        }

        guard latestBlockHeightOrFail() != nil else { return }

        do {
          let exportJson = try getUfvk()
          print("\nExport Ufvk:\n\(exportJson)")
          let exportRes: ExportUfvk = try decodeJSON(exportJson)
          XCTAssertEqual(exportRes.ufvk, ufvk)
          XCTAssertEqual(exportRes.birthday, 1)
        } catch {
          XCTFail("\nInit from UFVK error:\n\(error.localizedDescription)")
          return
        }

        assertHospitalAddresses()
    }
}

final class ExecuteVersionFromSeed: XCTestCase {
    func testExecuteVersionFromSeed() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://10.0.2.2:20000") else { return }
        guard latestBlockHeightOrFail() != nil else { return }

        do {
            let version = try getVersion()
            print("\nVersion:\n\(version)")
            XCTAssertFalse(version.isEmpty)
        } catch {
          XCTFail("\nVersion error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteSyncFromSeed: XCTestCase {
    func testExecuteSyncFromSeed() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://10.0.2.2:20000") else { return }
        guard let latestBlockHeight = latestBlockHeightOrFail() else { return }

        do {
            let hPreJson = try getLatestBlockWallet()
            print("\nHeight pre-sync:\n\(hPreJson)")
            let hPre: Height = try decodeJSON(hPreJson)
            XCTAssertEqual(hPre.height, 0)
        } catch {
          XCTFail("\nHeight pre-sync error:\n\(error.localizedDescription)")
          return
        }

        syncAndWait()

        do {
            let hPostJson = try getLatestBlockWallet()
            print("\nHeight post-sync:\n\(hPostJson)")
            let hPost: Height = try decodeJSON(hPostJson)
            XCTAssertEqual(hPost.height, latestBlockHeight)
        } catch {
          XCTFail("\nHeight post-sync error:\n\(error.localizedDescription)")
          return
        }
    }
}

/// Resolves the wallet's first transparent address, failing the test and
/// returning nil when there is none.
private func firstTransparentAddressOrFail() -> String? {
    do {
        let tAddrsJson = try getTransparentAddresses()
        print("\nT Addresses:\n\(tAddrsJson)")
        let tAddrs: [TransparentAddress] = try decodeJSON(tAddrsJson)
        guard let addr = tAddrs.first?.encoded_address, !addr.isEmpty else {
            XCTFail("No transparent address")
            return nil
        }
        return addr
    } catch {
        XCTFail("\nT Addresses error:\n\(error.localizedDescription)")
        return nil
    }
}

/// Proposes and confirms a send of `amount` zatoshis to `address`, failing
/// the test and returning false on either step's error.
private func sendAndConfirmOrFail(to address: String, amount: Int64) -> Bool {
    do {
        let sendJson = SendResult(address: address, amount: amount, memo: nil)
        let sendBodyData = try JSONEncoder().encode([sendJson])
        let sendBody = String(data: sendBodyData, encoding: .utf8)!
        let proposeJson = try send(sendJson: sendBody)
        print("\nPropose:\n\(proposeJson)")
    } catch {
        XCTFail("\nPropose error:\n\(error.localizedDescription)")
        return false
    }

    do {
        let confirmJson = try confirm()
        print("\nConfirm Txid:\n\(confirmJson)")
        return true
    } catch {
        XCTFail("\nConfirm error:\n\(error.localizedDescription)")
        return false
    }
}

final class ExecuteSendFromOrchard: XCTestCase {
    func testExecuteSendFromOrchard() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://10.0.2.2:20000") else { return }
        guard latestBlockHeightOrFail() != nil else { return }

        syncAndWait()

        do {
            let balJson = try getBalance()
            print("\nBalance pre-send:\n\(balJson)")
            let bal: Balance = try decodeJSON(balJson)
            // With the Ironwood network upgrade (NU6.3) active on the chain,
            // the funding send lands in the Ironwood pool; the orchard
            // balance staying zero guards that placement.
            XCTAssertEqual(bal.confirmedIronwoodBalance, 1_000_000)
            XCTAssertEqual(bal.confirmedOrchardBalance, 0)
            XCTAssertEqual(bal.confirmedTransparentBalance, 0)
        } catch {
          XCTFail("\nBalance pre-send error:\n\(error.localizedDescription)")
          return
        }

        guard let taddr = firstTransparentAddressOrFail() else { return }
        guard sendAndConfirmOrFail(to: taddr, amount: 100_000) else { return }

        syncAndWait()

        do {
            let balJson = try getBalance()
            print("\nBalance post-send:\n\(balJson)")
            let bal: Balance = try decodeJSON(balJson)
            XCTAssertEqual(bal.totalIronwoodBalance, 885_000)
            XCTAssertEqual(bal.confirmedTransparentBalance, 0)
            XCTAssertEqual(bal.unconfirmedTransparentBalance, 100_000)
        } catch {
          XCTFail("\nBalance post-send error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class UpdateCurrentPriceAndValueTransfersFromSeed: XCTestCase {
    func testUpdateCurrentPriceAndValueTransfersFromSeed() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://10.0.2.2:20000") else { return }
        guard latestBlockHeightOrFail() != nil else { return }

        do {
          let price = try zecPrice()
          print("\nPrice:\n\(price)")
        } catch {
          XCTFail("\nPrice error:\n\(error.localizedDescription)")
          return
        }

        syncAndWait()

        let recipientAddress = "uregtest1az7w9w3tdegf0srnsgqyqfhyfrpx2h6u4pkc2yq3ja552vzhwkjqgy4fu6a6kcu9280ppajamj2gcq9lx9x0zxdrsns94ml3e443a7t2dm50382mhtkleydrq74q5xlh6sel5u0qlrvflf20qgljzszd2ht9jmerwwahct9rtuc3nqdk"

        do {
            let vtJson = try getValueTransfers()
            print("\nValue Transfers:\n\(vtJson)")
            let vts: ValueTransfers = try decodeJSON(vtJson)
            XCTAssertEqual(vts.value_transfers.count, 3)

            // Orden y valores como en Kotlin
            XCTAssertEqual(vts.value_transfers[0].kind, "memo-to-self")
            XCTAssertEqual(vts.value_transfers[0].status, "confirmed")
            XCTAssertEqual(vts.value_transfers[0].value, 0)
            XCTAssertEqual(vts.value_transfers[0].transactionFee, 20_000)
            // Multi-pool entry pins the plural schema: a memo-to-self
            // settles change across Sapling and Ironwood.
            XCTAssertEqual(vts.value_transfers[0].poolsReceived, ["Sapling", "Ironwood"])

            XCTAssertEqual(vts.value_transfers[1].kind, "sent")
            XCTAssertEqual(vts.value_transfers[1].recipientAddress, recipientAddress)
            XCTAssertEqual(vts.value_transfers[1].status, "confirmed")
            XCTAssertEqual(vts.value_transfers[1].value, 100_000)
            XCTAssertEqual(vts.value_transfers[1].transactionFee, 10_000)

            XCTAssertEqual(vts.value_transfers[2].kind, "received")
            XCTAssertEqual(vts.value_transfers[2].poolsReceived, ["Ironwood"])
            XCTAssertEqual(vts.value_transfers[2].status, "confirmed")
            XCTAssertEqual(vts.value_transfers[2].value, 1_000_000)
        } catch {
          XCTFail("\nValue Transfers error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteSaplingBalanceFromSeed: XCTestCase {
    func testExecuteSaplingBalanceFromSeed() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://10.0.2.2:20000") else { return }
        guard latestBlockHeightOrFail() != nil else { return }

        syncAndWait()

        do {
            let vtJson = try getValueTransfers()
            print("\nValue Transfers:\n\(vtJson)")
        } catch {
          XCTFail("\nValue Transfers error:\n\(error.localizedDescription)")
          return
        }

        do {
          let balJson = try getBalance()
          print("\nBalance:\n\(balJson)")
          let bal: Balance = try decodeJSON(balJson)
          XCTAssertEqual(bal.totalIronwoodBalance, 710_000)
          XCTAssertEqual(bal.confirmedIronwoodBalance, 710_000)
          XCTAssertEqual(bal.confirmedOrchardBalance, 0)
          XCTAssertEqual(bal.totalSaplingBalance, 125_000)
          XCTAssertEqual(bal.confirmedSaplingBalance, 125_000)
          XCTAssertEqual(bal.confirmedTransparentBalance, 0)
        } catch {
          XCTFail("\nBalance error:\n\(error.localizedDescription)")
          return
        }

        let rpc = RPCModule()
        try rpc.saveWalletInternal()

        do {
          let changeJson = try changeServer(serveruri: "")
          print("\nChange Serveruri:\n\(changeJson)")
          XCTAssertFalse(isError(changeJson))
        } catch {
          XCTFail("\nChange Serveruri error:\n\(error.localizedDescription)")
          return
        }
        
        let loadJson = try rpc.fnLoadExistingWallet(serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: "1")
        print("\nLoad Wallet:\n\(loadJson)")
    }
}

final class ExecuteParseAddressForTex: XCTestCase {
    func testExecuteParseAddressForTex() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://10.0.2.2:20000") else { return }
        guard latestBlockHeightOrFail() != nil else { return }

        do {
          let resJson = try parseAddress(address: "texregtest1z754rp9kk9vdewx4wm7pstvm0u2rwlgy4zp82v")
          print("\nParsed address:\n\(resJson)")
          let res: ParseResult = try decodeJSON(resJson)

          let expected = ParseResult(status: "success", chain_name: "regtest", address_kind: "tex")
          XCTAssertEqual(res, expected)
        } catch {
          XCTFail("\nParse address error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteParseAddressInvalid: XCTestCase {
    func testExecuteParseAddressInvalid() throws {
        setCryptoProvider()

        guard initWalletFromSeed(serveruri: "http://127.0.0.1:20000") else { return }
        guard latestBlockHeightOrFail() != nil else { return }

        do {
          let wrongJson = try parseAddress(address: "thiswontwork")
          print("\nWrong address:\n\(wrongJson)")
          let wrong: ParseResult = try decodeJSON(wrongJson)

          let expectedWrong = ParseResult(status: "Invalid address", chain_name: nil, address_kind: nil)
          XCTAssertEqual(wrong, expectedWrong)
        } catch {
          XCTFail("\nWrong address error:\n\(error.localizedDescription)")
          return
        }
    }
}

/// The wallet-file base64 guard (zingo-mobile#1151; audit Issue Q). The FFI
/// save path now crosses as bytes, so the historical attack string — a valid
/// base64 export beginning with "error" — is unrepresentable there; this
/// validator's one remaining consumer is restoreExistingWalletBackup, which
/// checks file content read back from disk. Its acceptance rules are pinned
/// here: base64 is recognized by structure alone, never by sentinel.
class WalletFileBase64Tests: XCTestCase {
    func testContentResemblingAnErrorSentinelIsValid() {
        // Every case variant of the historical sentinel is well-formed
        // base64 and must validate.
        XCTAssertTrue(WalletExport.isValidBase64("errorAAA"))
        XCTAssertTrue(WalletExport.isValidBase64("ERRORAAA"))
    }

    func testFailureProseNeverValidates() {
        // Prose always contains ':' and ' ', both outside the base64
        // alphabet.
        XCTAssertFalse(WalletExport.isValidBase64("Error: disk full"))
    }

    func testEmptyContentNeverValidates() {
        XCTAssertFalse(WalletExport.isValidBase64(""))
    }

    func testMalformedContentNeverValidates() {
        XCTAssertFalse(WalletExport.isValidBase64("not base64 at all"))
    }

    func testPaddingMayOnlyTrail() {
        XCTAssertFalse(WalletExport.isValidBase64("AB=A"))
        XCTAssertTrue(WalletExport.isValidBase64("ABCD"))
    }

    func testPaddingIsAtMostTwoCharacters() {
        XCTAssertFalse(WalletExport.isValidBase64("A==="))
    }

    func testTrailingBitsMustBeZero() {
        // Non-canonical padding decodes downstream-dependently: the Rust
        // STANDARD engine rejects it, so the guard must too.
        XCTAssertFalse(WalletExport.isValidBase64("AB=="))
        XCTAssertFalse(WalletExport.isValidBase64("AAB="))
        XCTAssertTrue(WalletExport.isValidBase64("AA=="))
        XCTAssertTrue(WalletExport.isValidBase64("AAA="))
    }
}

/// The bridge-outcome contract for every migrated FFI (zingo-mobile#1151):
/// whether a call succeeded is knowable from the channel of its result —
/// resolved versus rejected — never from its content. One case per FFI,
/// exercising the typed error family the Rust side now throws for it.
/// These are the Swift twins of the Rust init_error_channel_tests, the
/// Kotlin FfiOutcomeTest, and the TypeScript ffiOutcome tests.
class FfiOutcomeTests: XCTestCase {
    private let ffiFailures: [(code: String, error: ZingolibError)] = [
        ("init_new", ZingolibError.Init(message: "boom")),
        ("init_from_seed", ZingolibError.Init(message: "boom")),
        ("init_from_ufvk", ZingolibError.Init(message: "boom")),
        ("init_from_b64", ZingolibError.Init(message: "boom")),
        ("run_sync", ZingolibError.Sync(message: "boom")),
        ("pause_sync", ZingolibError.Sync(message: "boom")),
        ("status_sync", ZingolibError.Sync(message: "boom")),
        ("poll_sync", ZingolibError.Sync(message: "boom")),
        ("run_rescan", ZingolibError.Rescan(message: "boom")),
        // The read getters' Rust sides are prose-free; their one typed
        // failure family is the uninitialized client.
        ("get_latest_block_wallet", ZingolibError.LightclientNotInitialized(message: "boom")),
        ("get_version", ZingolibError.LightclientNotInitialized(message: "boom")),
        ("get_unified_addresses", ZingolibError.LightclientNotInitialized(message: "boom")),
        ("get_transparent_addresses", ZingolibError.LightclientNotInitialized(message: "boom")),
        ("get_wallet_save_required", ZingolibError.LightclientNotInitialized(message: "boom")),
        ("get_config_wallet_performance", ZingolibError.LightclientNotInitialized(message: "boom")),
        ("get_wallet_version", ZingolibError.LightclientNotInitialized(message: "boom")),
        // The save shells run the save internals, whose failures throw;
        // success is the only value their data channel carries.
        ("save_wallet_bytes", ZingolibError.Save(message: "boom")),
        ("save_wallet_backup", ZingolibError.Save(message: "boom")),
        // The wallet-read getters whose domain failures are the typed
        // Read variant.
        ("get_balance", ZingolibError.Read(message: "boom")),
        ("get_spendable_balance_total", ZingolibError.Read(message: "boom")),
        ("get_value_transfers", ZingolibError.Read(message: "boom")),
        ("get_messages", ZingolibError.Read(message: "boom")),
        ("get_latest_block_server", ZingolibError.Read(message: "boom")),
        // The Ironwood drain, whose domain failures are the typed Drain
        // variant.
        ("drain_orchard_to_ironwood", ZingolibError.Drain(message: "boom"))
    ]

    func testResolvedValuesPassThroughUnclassified() {
        // The value deliberately wears the historical error sentinel:
        // classification must be by channel, never by content.
        let proseLikeData = "Error: looks like prose but is legitimate data"

        for (code, _) in ffiFailures {
            guard case .resolved(let value) = FfiOutcome.of(code, { proseLikeData }) else {
                return XCTFail("FFI \(code) must resolve")
            }
            XCTAssertEqual(value, proseLikeData, "FFI \(code) must resolve its value verbatim")
        }
    }

    func testThrownFfiErrorsRejectUnderTheFfiName() {
        for (code, failure) in ffiFailures {
            guard case .rejected(let rejectedCode, let error) = FfiOutcome.of(code, { throw failure }) else {
                return XCTFail("FFI \(code) must reject on a thrown error")
            }
            XCTAssertEqual(rejectedCode, code)
            XCTAssertTrue(error is ZingolibError, "FFI \(code) must reject with its typed error")
        }
    }
}

/// The shared plumbing for tests that drive RPCModule against a disposable
/// documents directory through the documentsDirectoryForTesting seam.
/// RPCModule.swift compiles directly into this test target, so its internal
/// members are reachable without a testable import. XCTest runs the classes
/// of a target serially, so the static override cannot leak into a test
/// running elsewhere, and tearDown always clears it. This base class
/// declares no tests of its own.
class InjectedDocumentsDirectoryTestCase: XCTestCase {
    var testDirectory: String = ""

    override func setUpWithError() throws {
        testDirectory = NSTemporaryDirectory() + "rpc-module-" + UUID().uuidString
        try FileManager.default.createDirectory(atPath: testDirectory, withIntermediateDirectories: true)
        RPCModule.documentsDirectoryForTesting = testDirectory
    }

    override func tearDownWithError() throws {
        // The seam resets first so a failed cleanup can never leave a later
        // test pointed at this directory. The permissions reset undoes the
        // read-only trick of the save-containment test before removal.
        RPCModule.documentsDirectoryForTesting = nil
        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: testDirectory)
        try? FileManager.default.removeItem(atPath: testDirectory)
    }

    func walletPath(_ file: Constants) -> String {
        return testDirectory + "/" + file.rawValue
    }

    func writeWalletFile(_ file: Constants, content: String) throws {
        try content.write(toFile: walletPath(file), atomically: true, encoding: .utf8)
    }

    func readWalletFile(_ file: Constants) throws -> String {
        return try String(contentsOfFile: walletPath(file), encoding: .utf8)
    }

    func walletFileExists(_ file: Constants) -> Bool {
        return FileManager.default.fileExists(atPath: walletPath(file))
    }
}

/// Audit Issue P (b) — the completePendingSwap decision table, exercised on
/// disk. The file contents are plain distinguishable strings because the
/// recovery compares bytes and never validates wallet content.
///
/// Documented red state: before the decision-table rework, any state with
/// both main and backup present wedged permanently, because the old
/// recovery's first rename (backup onto the existing main) always threw,
/// the catch swallowed the error, and the temp file lingered on every
/// launch. In the wedge test the temp-is-gone and backup-content assertions
/// failed against that implementation; in the backup-equals-temp test the
/// temp-is-gone assertion failed; and in the temp-only test the old code
/// moved the temp to backup and left no main wallet at all, so reading the
/// main wallet failed the test.
final class CompletePendingSwapRecoveryTests: InjectedDocumentsDirectoryTestCase {
    private let rpc = RPCModule()

    func testTheWedgeStateOfAllThreeFilesWithDistinctContentRecovers() throws {
        try writeWalletFile(.WalletTempSwapFileName, content: "original-main")
        try writeWalletFile(.WalletFileName, content: "fresh-main")
        try writeWalletFile(.WalletBackupFileName, content: "original-backup")

        rpc.completePendingSwap()

        // Main has moved past the swap, so it survives untouched while the
        // original main content becomes the backup.
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName), "The temp file must always leave the disk.")
        XCTAssertEqual(try readWalletFile(.WalletFileName), "fresh-main")
        XCTAssertEqual(try readWalletFile(.WalletBackupFileName), "original-main")

        // Recovery converged, so a second run must change nothing.
        rpc.completePendingSwap()
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName))
        XCTAssertEqual(try readWalletFile(.WalletFileName), "fresh-main")
        XCTAssertEqual(try readWalletFile(.WalletBackupFileName), "original-main")
    }

    func testAllThreeFilesWithMainEqualToTempCompleteTheSwap() throws {
        try writeWalletFile(.WalletTempSwapFileName, content: "original-main")
        try writeWalletFile(.WalletFileName, content: "original-main")
        try writeWalletFile(.WalletBackupFileName, content: "original-backup")

        rpc.completePendingSwap()

        // Main was recreated with the original content, so the recovery
        // drops that duplicate and finishes the swap.
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName))
        XCTAssertEqual(try readWalletFile(.WalletFileName), "original-backup")
        XCTAssertEqual(try readWalletFile(.WalletBackupFileName), "original-main")
    }

    func testAllThreeFilesWithBackupEqualToTempOnlyDropTheTemp() throws {
        try writeWalletFile(.WalletTempSwapFileName, content: "original-main")
        try writeWalletFile(.WalletFileName, content: "original-backup")
        try writeWalletFile(.WalletBackupFileName, content: "original-main")

        rpc.completePendingSwap()

        // The swap already completed; only the lingering temp goes away.
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName))
        XCTAssertEqual(try readWalletFile(.WalletFileName), "original-backup")
        XCTAssertEqual(try readWalletFile(.WalletBackupFileName), "original-main")
    }

    func testOnlyTheTempFileExistsRestoresItAsMain() throws {
        try writeWalletFile(.WalletTempSwapFileName, content: "original-main")

        rpc.completePendingSwap()

        // The temp is the only surviving copy of wallet data, so it must
        // become the main wallet rather than a backup of nothing.
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName))
        XCTAssertEqual(try readWalletFile(.WalletFileName), "original-main")
        XCTAssertFalse(walletFileExists(.WalletBackupFileName))
    }

    func testTempAndBackupFinishTheInterruptedSwap() throws {
        try writeWalletFile(.WalletTempSwapFileName, content: "original-main")
        try writeWalletFile(.WalletBackupFileName, content: "original-backup")

        rpc.completePendingSwap()

        // The crash fell between renames 1 and 2; renames 2 and 3 finish.
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName))
        XCTAssertEqual(try readWalletFile(.WalletFileName), "original-backup")
        XCTAssertEqual(try readWalletFile(.WalletBackupFileName), "original-main")
    }

    func testTempAndMainFinishTheLastRename() throws {
        try writeWalletFile(.WalletTempSwapFileName, content: "original-main")
        try writeWalletFile(.WalletFileName, content: "original-backup")

        rpc.completePendingSwap()

        // The crash fell between renames 2 and 3; rename 3 finishes.
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName))
        XCTAssertEqual(try readWalletFile(.WalletFileName), "original-backup")
        XCTAssertEqual(try readWalletFile(.WalletBackupFileName), "original-main")
    }

    func testWithoutATempFileNothingChanges() throws {
        try writeWalletFile(.WalletFileName, content: "fresh-main")
        try writeWalletFile(.WalletBackupFileName, content: "original-backup")

        rpc.completePendingSwap()

        XCTAssertEqual(try readWalletFile(.WalletFileName), "fresh-main")
        XCTAssertEqual(try readWalletFile(.WalletBackupFileName), "original-backup")
        XCTAssertFalse(walletFileExists(.WalletTempSwapFileName))
    }
}

/// The post-init save-containment contract: a disk failure after a
/// successful FFI init must not reject the whole wallet creation — the iOS
/// twin of the Android contract "the init flows depend on a save failure
/// not failing the whole init" (RPCModule.kt doSave). An empty server uri
/// leaves the client Indexerless, so the init succeeds offline, and the
/// injected documents directory is made read-only so only the post-init
/// save fails.
///
/// Documented red state: before containment, fnCreateNewWallet rethrew the
/// save failure, FfiOutcome classified it as rejected, and the reject
/// closure below fired its XCTFail against the pre-fix implementation.
final class CreateNewWalletSaveContainmentTests: InjectedDocumentsDirectoryTestCase {
    func testCreateNewWalletResolvesWhenOnlyThePostInitSaveFails() throws {
        setCryptoProvider()
        // A read-only directory makes every wallet write fail after the
        // FFI init has already succeeded in memory.
        try FileManager.default.setAttributes([.posixPermissions: 0o555], ofItemAtPath: testDirectory)

        let rpc = RPCModule()
        let settled = expectation(description: "createNewWallet settles")
        var resolvedValue: String?
        rpc.createNewWallet(
            "",
            birthday: "1",
            chainhint: "regtest",
            performancelevel: "Medium",
            minconfirmations: "1",
            resolve: { value in
                resolvedValue = value as? String
                settled.fulfill()
            },
            reject: { code, message, _ in
                XCTFail("A failed post-init save must not reject the init: \(code ?? "") \(message ?? "")")
                settled.fulfill()
            }
        )
        wait(for: [settled], timeout: 120)

        // The init result reaches the resolve channel even though the save
        // failed, and the absent wallet file proves the save really failed.
        XCTAssertNotNil(resolvedValue)
        XCTAssertFalse(resolvedValue?.isEmpty ?? true)
        XCTAssertFalse(walletFileExists(.WalletFileName), "The save must actually fail to pin containment.")
    }
}

/// The restore-failure classification contract at the native layer: a
/// backup whose content fails the structural base64 guard settles the
/// promise as the resolved string "false" — never a rejection and never a
/// success value — matching Android's restoreExistingWalletBackup and the
/// TypeScript seam that consumes the resolved value.
final class RestoreBackupClassificationTests: InjectedDocumentsDirectoryTestCase {
    func testAnInvalidBackupResolvesFalseWithoutRejecting() throws {
        try writeWalletFile(.WalletBackupFileName, content: "Error: not base64 at all")

        let rpc = RPCModule()
        let settled = expectation(description: "restoreExistingWalletBackup settles")
        var resolvedValue: String?
        rpc.restoreExistingWalletBackup(
            { value in
                resolvedValue = value as? String
                settled.fulfill()
            },
            reject: { code, message, _ in
                XCTFail("An invalid backup must resolve, not reject: \(code ?? "") \(message ?? "")")
                settled.fulfill()
            }
        )
        wait(for: [settled], timeout: 30)

        XCTAssertEqual(resolvedValue, "false")
    }
}
