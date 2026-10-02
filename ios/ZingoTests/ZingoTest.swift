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
import ZingoBindings

enum Seeds {
    static let HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

enum MainnetServers {
    static let PRIMARY = "https://zec.rocks:443"
    static let FALLBACK = "https://na.zec.rocks:443"
}

/// The shared testnet fixture wallet, which is zingolib's GloryGoddess example wallet.
enum TestnetFixture {
    static let SEED = "glory goddess cargo action guilt ball coral employ phone baby oxygen flavor solid climb situate frequent blade pet enough milk access try swift benefit"
    static let BIRTHDAY: UInt64 = 4_378_218
    static let SERVER = "https://testnet.zec.rocks:443"
    static let CHAIN_HINT = "test"
    static let UNIFIED_ADDRESS = "utest1dmu08vg5wt5m9w0ejwgeqdndzzkfka7c94heuz5llxv5vx4lhcethmm6p5ean3wcj8l0m6tf8k8cau9r636gq7sxq3wa6zey2sysfteh"
    static let TRANSPARENT_ADDRESS = "tmF7QpuKsLF7nsMvThu4wQBpiKVGJXGCSJF"

    static let CONSOLIDATION_TXID = "256fc8dcb3dd730439157301a027f7b243d69aa30e31fc7a9b619e726321d19f"
    static let CONSOLIDATION_HEIGHT: Int64 = 4_431_582
    static let CONSOLIDATION_KIND = "memo-to-self"
    static let CONSOLIDATION_VALUE: Int64 = 3_995_811_890
    static let CONSOLIDATION_FEE: Int64 = 285_000

    static let DEADLINE_SECONDS: TimeInterval = 5 * 60
    static let TIP_SKEW_BLOCKS: UInt64 = 10
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
    let session_ironwood_outputs_scanned: UInt64?
    let total_ironwood_outputs_scanned: UInt64?
    let percentage_session_outputs_scanned: Double?
    let percentage_total_outputs_scanned: Double?
    let total_outputs_scanned: UInt64?
    let total_outputs: UInt64?
}

struct Balance: Codable {
    let total_ironwood_balance: Int64
    let confirmed_ironwood_balance: Int64
    let unconfirmed_ironwood_balance: Int64
    let total_sapling_balance: Int64
    let confirmed_sapling_balance: Int64
    let unconfirmed_sapling_balance: Int64
    let total_orchard_balance: Int64
    let confirmed_orchard_balance: Int64
    let unconfirmed_orchard_balance: Int64
    let total_transparent_balance: Int64
    let confirmed_transparent_balance: Int64
    let unconfirmed_transparent_balance: Int64
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
    let transaction_fee: Int64?
    let zec_price: Int64?
    let kind: String
    let value: Int64
    let recipient_address: String?
    let pools_sent_from: [String]?
    let pools_received: [String]?
    let memos: [String]?
}

struct ValueTransfers: Codable {
    let value_transfers: [ValueTransfer]
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

/// A public-chain test failure that carries its reason.
struct ChainFailure: Error, CustomStringConvertible {
    let description: String
}

/// Skips the test while the fixture names no consolidation transaction.
private func skipUnlessConsolidationPublished() throws {
    try XCTSkipIf(TestnetFixture.CONSOLIDATION_TXID.isEmpty, "TestnetFixture names no consolidation transaction yet")
}

/// Returns the tip height that the server at `uri` reports.
private func tipOf(_ uri: String) throws -> UInt64 {
    let height = try getLatestBlockServer(serveruri: uri)
    guard let tip = UInt64(height) else {
        throw ChainFailure(description: "\(uri) reported a malformed tip: \(height)")
    }
    return tip
}

/// Returns the tip of the testnet fixture server, failing with the server's error when it does not answer.
private func testnetTip() throws -> UInt64 {
    do {
        return try tipOf(TestnetFixture.SERVER)
    } catch let error as ZingolibError {
        throw ChainFailure(description: "the testnet server \(TestnetFixture.SERVER) did not answer: \(error)")
    }
}

/// Returns the sync status of the open wallet, or the reason it is unavailable.
private func syncStatusOrReason() -> String {
    do {
        return try statusSync()
    } catch {
        return "status unavailable: \(error)"
    }
}

/// Launches a sync of `what` and polls it each second to completion, failing with the elapsed time and the sync status at the deadline or on a sync error.
private func syncToCompletion(_ what: String, deadlineSeconds: TimeInterval, start: Date) throws {
    let syncJson = try runSync()
    print("\nSync:\n\(syncJson)")

    let syncStart = Date()
    do {
        while try !pollSync().contains("sync_complete") {
            let elapsed = Date().timeIntervalSince(start)
            if elapsed > deadlineSeconds {
                throw ChainFailure(description: "the test passed its \(Int(deadlineSeconds)) s deadline after \(elapsed) s while syncing \(what): \(syncStatusOrReason())")
            }
            Thread.sleep(forTimeInterval: 1.0)
        }
    } catch let error as ZingolibError {
        throw ChainFailure(description: "the sync of \(what) failed after \(Date().timeIntervalSince(start)) s: \(error): \(syncStatusOrReason())")
    }
    print("\nSynced \(what) in \(Date().timeIntervalSince(syncStart)) s")
}

final class ExecuteAddressesFromSeed: XCTestCase {
    func testExecuteAddressesFromSeed() throws {

        let seed = Seeds.HOSPITAL

        do {
            let initJson = try initFromSeed(seed: seed, birthday:UInt32(1), serveruri: "", chainhint: "regtest", performancelevel: "Medium", minconfirmations: UInt32(1))
            print("\nInit from seed:\n\(initJson)")
            let initRes: InitFromSeed = try decodeJSON(initJson)
            XCTAssertEqual(initRes.seed_phrase, seed)
            XCTAssertEqual(initRes.birthday, 1)
        } catch {
          XCTFail("\nInit from seed error:\n\(error.localizedDescription)")
          return
        }

        do {
            let addrsJson = try getUnifiedAddresses()
            print("\nAddresses:\n\(addrsJson)")
            let addrs: [UnifiedAddress] = try decodeJSON(addrsJson)
            XCTAssertEqual(addrs[0].encoded_address, "uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9")
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
            XCTAssertEqual(tAddrs[0].encoded_address, "tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i")
            XCTAssertEqual(tAddrs[0].scope, "external")
        } catch {
          XCTFail("\nT Addresses error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteAddressFromUfvk: XCTestCase {
    func testExecuteAddressFromUfvk() throws {

        let ufvk = UfvkConst.HOSPITAL

        do {
          let initJson = try initFromUfvk(ufvk: ufvk, birthday: UInt32(1), serveruri: "", chainhint: "regtest", performancelevel: "Medium", minconfirmations: UInt32(1))
          print("\nInit From UFVK:\n\(initJson)")
          let initRes: InitFromUfvk = try decodeJSON(initJson)
          XCTAssertEqual(initRes.ufvk, ufvk)
          XCTAssertEqual(initRes.birthday, 1)
        } catch {
          XCTFail("\nInit from UFVK error:\n\(error.localizedDescription)")
          return
        }

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

        do {
            let addrsJson = try getUnifiedAddresses()
            print("\nAddresses:\n\(addrsJson)")
            let addrs: [UnifiedAddress] = try decodeJSON(addrsJson)
            XCTAssertEqual(addrs[0].encoded_address, "uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9")
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
            XCTAssertEqual(tAddrs[0].encoded_address, "tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i")
            XCTAssertEqual(tAddrs[0].scope, "external")
        } catch {
          XCTFail("\nT Addresses error:\n\(error.localizedDescription)")
          return
        }

    }
}

final class ExecuteVersionFromSeed: XCTestCase {
    func testExecuteVersionFromSeed() throws {
        let seed = Seeds.HOSPITAL

        do {
          let initJson = try initFromSeed(seed: seed, birthday: UInt32(1), serveruri: "", chainhint: "regtest", performancelevel: "Medium", minconfirmations: UInt32(1))
          print("\nInit from seed:\n\(initJson)")
          let initRes: InitFromSeed = try decodeJSON(initJson)
          XCTAssertEqual(initRes.seed_phrase, seed)
          XCTAssertEqual(initRes.birthday, 1)
        } catch {
          XCTFail("\nInit from seed error:\n\(error.localizedDescription)")
          return
        }

        do {
            let version = try getVersion()
            print("\nVersion:\n\(version)")
            let part = "[0-9A-Za-z.+-]+(_[0-9a-f]{5})?(_dirty)?"
            XCTAssertNotNil(version.range(of: "^zl_\(part)-zm_\(part)$", options: .regularExpression), version)
        } catch {
          XCTFail("\nVersion error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteSyncFromSeed: XCTestCase {
    func testExecuteSyncFromSeed() throws {
        let window: UInt64 = 10_000
        let deadlineSeconds: TimeInterval = 5 * 60
        let tipSkewBlocks: UInt64 = 1
        let seed = Seeds.HOSPITAL
        let servers = [MainnetServers.PRIMARY, MainnetServers.FALLBACK]
        let start = Date()

        var refusals: [String: Error] = [:]
        var answer: (uri: String, tip: UInt64)?
        for uri in servers {
            do {
                answer = (uri, try tipOf(uri))
                break
            } catch {
                refusals[uri] = error
            }
        }
        guard let answer else {
            throw ChainFailure(description: "no mainnet server answered: \(refusals)")
        }
        let (serveruri, tip) = answer
        print("\nTip of \(serveruri): \(tip)")

        let birthday = tip - window
        let initJson = try initFromSeed(seed: seed, birthday: UInt32(birthday), serveruri: serveruri, chainhint: "main", performancelevel: "Medium", minconfirmations: UInt32(1))
        print("\nInit from seed:\n\(initJson)")
        let initRes: InitFromSeed = try decodeJSON(initJson)
        XCTAssertEqual(initRes.seed_phrase, seed)
        XCTAssertEqual(initRes.birthday, birthday)

        let infoJson = try infoServer()
        print("\nInfo:\n\(infoJson)")
        let info: Info = try decodeJSON(infoJson)
        XCTAssertGreaterThanOrEqual(info.latest_block_height, tip - tipSkewBlocks)

        let hPreJson = try getLatestBlockWallet()
        print("\nHeight pre-sync:\n\(hPreJson)")
        let hPre: Height = try decodeJSON(hPreJson)
        XCTAssertEqual(hPre.height, 0)

        try syncToCompletion("\(window) mainnet blocks", deadlineSeconds: deadlineSeconds, start: start)

        let hPostJson = try getLatestBlockWallet()
        print("\nHeight post-sync:\n\(hPostJson)")
        let hPost: Height = try decodeJSON(hPostJson)
        XCTAssertGreaterThanOrEqual(hPost.height, info.latest_block_height)
    }
}

final class ConfirmRefusesWithoutMixnet: XCTestCase {
    func testConfirmRefusesWithoutMixnet() throws {
        try skipUnlessConsolidationPublished()

        let amount: Int64 = 100_000
        let fee: Int64 = 20_000
        let start = Date()

        let tip = try testnetTip()
        print("\nTip of \(TestnetFixture.SERVER): \(tip)")

        let initJson = try initFromSeed(seed: TestnetFixture.SEED, birthday: UInt32(TestnetFixture.BIRTHDAY), serveruri: TestnetFixture.SERVER, chainhint: TestnetFixture.CHAIN_HINT, performancelevel: "Medium", minconfirmations: UInt32(1))
        print("\nInit from seed:\n\(initJson)")
        let initRes: InitFromSeed = try decodeJSON(initJson)
        XCTAssertEqual(initRes.seed_phrase, TestnetFixture.SEED)
        XCTAssertEqual(initRes.birthday, TestnetFixture.BIRTHDAY)

        let infoJson = try infoServer()
        print("\nInfo:\n\(infoJson)")
        let info: Info = try decodeJSON(infoJson)
        XCTAssertGreaterThanOrEqual(info.latest_block_height, tip - TestnetFixture.TIP_SKEW_BLOCKS)

        let addrsJson = try getUnifiedAddresses()
        print("\nAddresses:\n\(addrsJson)")
        let addrs: [UnifiedAddress] = try decodeJSON(addrsJson)
        XCTAssertEqual(addrs[0].encoded_address, TestnetFixture.UNIFIED_ADDRESS)

        let tAddrsJson = try getTransparentAddresses()
        print("\nT Addresses:\n\(tAddrsJson)")
        let tAddrs: [TransparentAddress] = try decodeJSON(tAddrsJson)
        XCTAssertEqual(tAddrs[0].encoded_address, TestnetFixture.TRANSPARENT_ADDRESS)

        try syncToCompletion("\(tip - TestnetFixture.BIRTHDAY) testnet blocks", deadlineSeconds: TestnetFixture.DEADLINE_SECONDS, start: start)

        let hPostJson = try getLatestBlockWallet()
        print("\nHeight post-sync:\n\(hPostJson)")
        let hPost: Height = try decodeJSON(hPostJson)
        XCTAssertGreaterThanOrEqual(hPost.height, tip - TestnetFixture.TIP_SKEW_BLOCKS)

        let vts: ValueTransfers = try decodeJSON(try getValueTransfers())
        XCTAssertTrue(vts.value_transfers.map(\.txid).contains(TestnetFixture.CONSOLIDATION_TXID))

        let balPreJson = try getBalance()
        print("\nBalance pre-send:\n\(balPreJson)")
        let balPre: Balance = try decodeJSON(balPreJson)
        XCTAssertGreaterThanOrEqual(balPre.confirmed_orchard_balance + balPre.confirmed_ironwood_balance, amount + fee)

        let sendBodyData = try JSONEncoder().encode([SendResult(address: TestnetFixture.TRANSPARENT_ADDRESS, amount: amount, memo: nil)])
        let proposeJson = try send(sendJson: String(decoding: sendBodyData, as: UTF8.self))
        print("\nPropose:\n\(proposeJson)")

        do {
            let confirmJson = try confirm()
            XCTFail("\nThe transmission answered without a mixnet:\n\(confirmJson)")
            return
        } catch ZingolibError.Mixnet(let message) {
            print("\nTransmission refused without a mixnet:\n\(message)")
            XCTAssertTrue(message.contains("the Nym mixnet is not enabled"), message)
        }

        do {
            let txid = try confirm()
            XCTFail("\nA consumed proposal confirmed on retry:\n\(txid)")
            return
        } catch ZingolibError.Send(let message) {
            print("\nRetry after the refusal:\n\(message)")
        }

        try syncToCompletion("the blocks mined since the first sync", deadlineSeconds: TestnetFixture.DEADLINE_SECONDS, start: start)

        let balPostJson = try getBalance()
        print("\nBalance post-refusal:\n\(balPostJson)")
        let balPost: Balance = try decodeJSON(balPostJson)
        XCTAssertGreaterThanOrEqual(balPost.confirmed_transparent_balance, balPre.confirmed_transparent_balance)
    }
}

final class RecoversConsolidationTransfer: XCTestCase {
    func testRecoversConsolidationTransfer() throws {
        try skipUnlessConsolidationPublished()

        let start = Date()

        let tip = try testnetTip()
        print("\nTip of \(TestnetFixture.SERVER): \(tip)")

        let initJson = try initFromSeed(seed: TestnetFixture.SEED, birthday: UInt32(TestnetFixture.BIRTHDAY), serveruri: TestnetFixture.SERVER, chainhint: TestnetFixture.CHAIN_HINT, performancelevel: "Medium", minconfirmations: UInt32(1))
        print("\nInit from seed:\n\(initJson)")
        let initRes: InitFromSeed = try decodeJSON(initJson)
        XCTAssertEqual(initRes.seed_phrase, TestnetFixture.SEED)
        XCTAssertEqual(initRes.birthday, TestnetFixture.BIRTHDAY)

        let infoJson = try infoServer()
        print("\nInfo:\n\(infoJson)")
        let info: Info = try decodeJSON(infoJson)
        XCTAssertGreaterThanOrEqual(info.latest_block_height, tip - TestnetFixture.TIP_SKEW_BLOCKS)

        try syncToCompletion("\(tip - TestnetFixture.BIRTHDAY) testnet blocks", deadlineSeconds: TestnetFixture.DEADLINE_SECONDS, start: start)

        let vtJson = try getValueTransfers()
        print("\nValue Transfers:\n\(vtJson)")
        let vts: ValueTransfers = try decodeJSON(vtJson)

        let consolidations = vts.value_transfers.filter {
            $0.txid == TestnetFixture.CONSOLIDATION_TXID && $0.kind == TestnetFixture.CONSOLIDATION_KIND
        }
        XCTAssertEqual(consolidations.count, 1)
        let consolidation = try XCTUnwrap(consolidations.first)
        XCTAssertEqual(consolidation.status, "confirmed")
        XCTAssertEqual(consolidation.blockheight, TestnetFixture.CONSOLIDATION_HEIGHT)
        XCTAssertEqual(consolidation.value, TestnetFixture.CONSOLIDATION_VALUE)
        XCTAssertEqual(consolidation.transaction_fee, TestnetFixture.CONSOLIDATION_FEE)
    }
}

final class PriceRefusedWithoutMixnet: XCTestCase {
    func testPriceRefusedWithoutMixnet() throws {
        let seed = Seeds.HOSPITAL

        do {
          let initJson = try initFromSeed(seed: seed, birthday: UInt32(1), serveruri: "", chainhint: "regtest", performancelevel: "Medium", minconfirmations: UInt32(1))
          print("\nInit from seed:\n\(initJson)")
          let initRes: InitFromSeed = try decodeJSON(initJson)
          XCTAssertEqual(initRes.seed_phrase, seed)
        } catch {
          XCTFail("\nInit from seed error:\n\(error.localizedDescription)")
          return
        }

        do {
          let price = try zecPrice()
          XCTFail("\nThe price fetch answered without a mixnet:\n\(price)")
        } catch ZingolibError.Mixnet(let message) {
          print("\nPrice refused without a mixnet:\n\(message)")
        } catch {
          XCTFail("\nThe price fetch failed without refusing:\n\(error.localizedDescription)")
        }
    }
}

final class ExecuteSaplingBalanceFromSeed: XCTestCase {
    func testExecuteSaplingBalanceFromSeed() throws {

        let serveruri = "http://10.0.2.2:20000"
        let chainhint = "regtest"
        let seed = Seeds.HOSPITAL

        do {
          let initJson = try initFromSeed(seed: seed, birthday: UInt32(1), serveruri: serveruri, chainhint: chainhint, performancelevel: "Medium", minconfirmations: UInt32(1))
          print("\nInit from seed:\n\(initJson)")
          let initRes: InitFromSeed = try decodeJSON(initJson)
          XCTAssertEqual(initRes.seed_phrase, seed)
          XCTAssertEqual(initRes.birthday, 1)
        } catch {
          XCTFail("\nInit from seed error:\n\(error.localizedDescription)")
          return
        }

        var latest_block_height: UInt64 = UInt64.zero
        do {
            let infoJson = try infoServer()
            print("\nInfo:\n\(infoJson)")
            let info: Info = try decodeJSON(infoJson)
            latest_block_height = info.latest_block_height
            XCTAssertGreaterThan(latest_block_height, UInt64.zero)
        } catch {
          XCTFail("\nInfo error:\n\(error.localizedDescription)")
          return
        }

        do {
            let syncJson = try runSync()
            print("\nSync:\n\(syncJson)")
        } catch {
            print("\nSync error:\n\(error.localizedDescription)")
        }

        waitForSyncOrFail()

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
          XCTAssertEqual(bal.total_orchard_balance, 710_000)
          XCTAssertEqual(bal.confirmed_orchard_balance, 710_000)
          XCTAssertEqual(bal.total_sapling_balance, 125_000)
          XCTAssertEqual(bal.confirmed_sapling_balance, 125_000)
          XCTAssertEqual(bal.confirmed_transparent_balance, 0)
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

/// The bridge-outcome contract for every migrated FFI (zingo-mobile#1151):
/// whether a call succeeded is knowable from the channel of its result —
/// resolved versus rejected — never from its content, and a rejection's
/// code is exactly the thrown ZingolibError variant's name, the stable
/// code shared by every bridge. One case per contract variant. These are
/// the Swift twins of the Rust init_error_channel_tests, the Kotlin
/// FfiOutcomeTest, and the TypeScript ffiOutcome tests.
class FfiOutcomeTests: XCTestCase {
    // Every contract variant, paired with its stable rejection code.
    private let contractVariants: [(error: ZingolibError, code: String)] = [
        (ZingolibError.LightclientNotInitialized(message: "boom"), "LightclientNotInitialized"),
        (ZingolibError.LightclientLockPoisoned(message: "boom"), "LightclientLockPoisoned"),
        (ZingolibError.Panic(message: "boom"), "Panic"),
        (ZingolibError.Save(message: "boom"), "Save"),
        (ZingolibError.Init(message: "boom"), "Init"),
        (ZingolibError.Sync(message: "boom"), "Sync"),
        (ZingolibError.Rescan(message: "boom"), "Rescan"),
        (ZingolibError.Read(message: "boom"), "Read"),
        (ZingolibError.Send(message: "boom"), "Send"),
        (ZingolibError.Shield(message: "boom"), "Shield"),
        (ZingolibError.InvalidInput(message: "boom"), "InvalidInput"),
        (ZingolibError.Wallet(message: "boom"), "Wallet"),
        (ZingolibError.Indexer(message: "boom"), "Indexer"),
        (ZingolibError.Offline(message: "boom"), "Offline"),
        (ZingolibError.SideChannelPoisoned(message: "boom"), "SideChannelPoisoned"),
        (ZingolibError.MigrationNotInProgress(message: "boom"), "MigrationNotInProgress"),
        (ZingolibError.MigrationAlreadyInProgress(message: "boom"), "MigrationAlreadyInProgress"),
        (ZingolibError.MigrationConsentStale(message: "boom"), "MigrationConsentStale"),
        (ZingolibError.MigrationCadenceFixed(message: "boom"), "MigrationCadenceFixed"),
        (ZingolibError.MigrationSplit(message: "boom"), "MigrationSplit"),
        (ZingolibError.Migration(message: "boom"), "Migration"),
        (ZingolibError.Mixnet(message: "boom"), "Mixnet"),
    ]

    func testResolvedValuesPassThroughUnclassified() {
        // The value deliberately wears the historical error sentinel:
        // classification must be by channel, never by content.
        let proseLikeData = "Error: looks like prose but is legitimate data"

        guard case .resolved(let value) = FfiOutcome.of({ proseLikeData }) else {
            return XCTFail("A returning call must resolve")
        }
        XCTAssertEqual(value, proseLikeData, "A returning call must resolve its value verbatim")
    }

    func testThrownFfiErrorsRejectUnderTheVariantName() {
        for (failure, expectedCode) in contractVariants {
            guard case .rejected(let code, let message, let error) = FfiOutcome.of({ throw failure }) else {
                return XCTFail("Variant \(expectedCode) must reject on a thrown error")
            }
            XCTAssertEqual(code, expectedCode, "The rejection code is exactly the variant's name")
            XCTAssertEqual(message, "boom", "The rejection message is the error's message, verbatim")
            XCTAssertTrue(error is ZingolibError, "Variant \(expectedCode) must reject with its typed error")
        }
    }

    func testNonFfiErrorsRejectAsUnknown() {
        struct Boom: Error {}
        guard case .rejected(let code, let message, let error) = FfiOutcome.of({ throw Boom() }) else {
            return XCTFail("A non-FFI error must still reject")
        }
        XCTAssertEqual(code, "Unknown", "Errors outside the contract reject under the catch-all code")
        XCTAssertFalse(message.isEmpty, "Even a catch-all rejection carries a diagnostic message")
        XCTAssertTrue(error is Boom, "The original error object crosses the bridge")
    }
}

/// The numeric-arg contract of the bridge (zingo-mobile#1151): a malformed
/// or overflowing string throws the typed InvalidInput with the same
/// message shape the Android bridge rejects with — never a silent default
/// (the old per_bucket bug) and never an unsettled promise (the old
/// reschedule/execute bug). The Swift twin of the Kotlin FfiArgsTest.
class FfiArgsTests: XCTestCase {
    func testValidNumbersParse() throws {
        XCTAssertEqual(try FfiArgs.requiredU32("7", name: "per_bucket"), 7)
        XCTAssertEqual(try FfiArgs.requiredU32("4294967295", name: "per_bucket"), UInt32.max)
        XCTAssertEqual(try FfiArgs.requiredU64("250", name: "spacing_ms"), 250)
        XCTAssertEqual(
            try FfiArgs.requiredU64("18446744073709551615", name: "spacing_ms"), UInt64.max)
        XCTAssertEqual(try FfiArgs.optionalU32("7", name: "per_bucket"), 7)
    }

    func testEmptyOptionalMeansAbsentNeverZero() throws {
        XCTAssertNil(try FfiArgs.optionalU32("", name: "per_bucket"))
    }

    func testMalformedAndOverflowingValuesRejectAsInvalidInput() {
        let rejected: [(raw: String, parse: () throws -> Any)] = [
            ("not-a-number", { try FfiArgs.requiredU32("not-a-number", name: "per_bucket") }),
            ("-1", { try FfiArgs.requiredU32("-1", name: "per_bucket") }),
            ("4294967296", { try FfiArgs.requiredU32("4294967296", name: "per_bucket") }),
            ("1.5", { try FfiArgs.optionalU32("1.5", name: "per_bucket") as Any }),
            ("18446744073709551616",
             { try FfiArgs.requiredU64("18446744073709551616", name: "spacing_ms") }),
        ]
        for (raw, parse) in rejected {
            XCTAssertThrowsError(try parse(), "\"\(raw)\" must reject, never default") { error in
                guard case ZingolibError.InvalidInput = error else {
                    return XCTFail("\"\(raw)\" must throw the typed InvalidInput, got \(error)")
                }
            }
        }
    }

    func testTheRejectionMessageMatchesTheAndroidBridgeShape() {
        XCTAssertThrowsError(try FfiArgs.requiredU32("nope", name: "per_bucket")) { error in
            guard case ZingolibError.InvalidInput(let message) = error else {
                return XCTFail("expected the typed InvalidInput, got \(error)")
            }
            XCTAssertEqual(message, "per_bucket must be a u32: \"nope\"")
        }
        XCTAssertThrowsError(try FfiArgs.requiredU64("nope", name: "spacing_ms")) { error in
            guard case ZingolibError.InvalidInput(let message) = error else {
                return XCTFail("expected the typed InvalidInput, got \(error)")
            }
            XCTAssertEqual(message, "spacing_ms must be a u64: \"nope\"")
        }
    }

    func testTheRejectionCrossesTheBridgeAsInvalidInputNeverUnknown() {
        let outcome = FfiOutcome.of {
            _ = try FfiArgs.requiredU32("not-a-number", name: "per_bucket")
            return ""
        }
        guard case .rejected(let code, _, _) = outcome else {
            return XCTFail("a malformed numeric arg must reject")
        }
        XCTAssertEqual(
            code, "InvalidInput",
            "a malformed numeric arg must reject under InvalidInput on both platforms")
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

/// The per-file diagnosis behind the recovery dialog, and the migration
/// from the legacy base64 text format to raw wallet bytes.
class WalletFileDiagnosisTests: XCTestCase {
    private func mainEntry(_ rpc: RPCModule) -> [String: Any]? {
        rpc.walletFileDiagnosis().first { $0["name"] as? String == Constants.WalletFileName.rawValue }
    }

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

    func testARawWalletFileDiagnosesPlainWallet() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        try walletBytes().write(to: URL(fileURLWithPath: path))

        let entry = try XCTUnwrap(mainEntry(rpc))
        XCTAssertEqual(entry["state"] as? String, "plainWallet")
        XCTAssertGreaterThan(entry["size"] as? Int ?? 0, 0)
    }

    func testATruncatedRawWalletFileDiagnosesPlainWallet() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        try walletBytes().prefix(20).write(to: URL(fileURLWithPath: path))

        let entry = try XCTUnwrap(mainEntry(rpc))
        XCTAssertEqual(entry["state"] as? String, "plainWallet")
    }

    func testALegacyBase64TextFileDiagnosesPlainWallet() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        let text = walletBytes().base64EncodedString()
        try String(text.prefix(text.count / 2 + 1)).write(
            toFile: path, atomically: true, encoding: .utf8)

        let entry = try XCTUnwrap(mainEntry(rpc))
        XCTAssertEqual(entry["state"] as? String, "plainWallet")
    }

    func testGarbageTextDiagnosesUnknown() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        try "!!!not-base64!!!".write(toFile: path, atomically: true, encoding: .utf8)

        let entry = try XCTUnwrap(mainEntry(rpc))
        XCTAssertEqual(entry["state"] as? String, "unknown")
    }

    func testALegacyTextFileMigratesToRawBytesOnRead() throws {
        _ = try initFromSeed(
            seed: Seeds.HOSPITAL, birthday: UInt32(2_000_000), serveruri: "",
            chainhint: "main", performancelevel: "Medium", minconfirmations: UInt32(1))
        let wallet = try XCTUnwrap(try saveWalletBytes())

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

    func testAMissingFileDiagnosesMissing() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        try? FileManager.default.removeItem(atPath: path)

        let entry = try XCTUnwrap(mainEntry(rpc))
        XCTAssertEqual(entry["state"] as? String, "missing")
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

    func testAClosedWalletFileRefusesTheSave() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try walletA.write(toFile: files.main, atomically: true, encoding: .utf8)

        RPCModule.walletFileClosed = true
        try rpc.saveWalletInternal()

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
