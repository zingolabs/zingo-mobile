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
    static let SERVERS = [PRIMARY, FALLBACK]
}

/// The deadline every public-chain test shares.
enum PublicChain {
    static let DEADLINE_SECONDS: TimeInterval = 5 * 60
}

/// The shared testnet fixture wallet, which is zingolib's GloryGoddess example wallet.
enum TestnetFixture {
    static let SEED = "glory goddess cargo action guilt ball coral employ phone baby oxygen flavor solid climb situate frequent blade pet enough milk access try swift benefit"
    static let BIRTHDAY: UInt64 = 4_579_900
    static let SERVERS = ["https://testnet.zec.rocks:443", "https://zaino.testnet.unsafe.zec.rocks:443"]
    static let CHAIN_HINT = "test"
    static let UNIFIED_ADDRESS = "utest1dmu08vg5wt5m9w0ejwgeqdndzzkfka7c94heuz5llxv5vx4lhcethmm6p5ean3wcj8l0m6tf8k8cau9r636gq7sxq3wa6zey2sysfteh"
    static let TRANSPARENT_ADDRESS = "tmF7QpuKsLF7nsMvThu4wQBpiKVGJXGCSJF"

    static let CONSOLIDATION_TXID = "2b8417caed4e46934b237729eb578a6fcd7388dde640e626df3e54f2feefd063"
    static let CONSOLIDATION_HEIGHT: Int64 = 4_579_990
    static let CONSOLIDATION_KIND = "memo-to-self"
    static let CONSOLIDATION_VALUE: Int64 = 3_051_533_557
    static let CONSOLIDATION_FEE: Int64 = 95_000

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

struct SpendableBalance: Codable {
    let spendable_balance: Int64
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

/// A public-chain test failure that carries its reason.
struct ChainFailure: Error, CustomStringConvertible {
    let description: String
}

/// Returns the tip height that the server at `uri` reports.
private func tipOf(_ uri: String) throws -> UInt64 {
    let height = try getLatestBlockServer(serveruri: uri)
    guard let tip = UInt64(height) else {
        throw ChainFailure(description: "\(uri) reported a malformed tip: \(height)")
    }
    return tip
}

/// Returns the first of `servers` that reports its tip, paired with that tip, and fails with every refusal when no `chain` server answers.
private func firstAnsweringServer(_ chain: String, _ servers: [String]) throws -> (uri: String, tip: UInt64) {
    var refusals: [String: Error] = [:]
    for uri in servers {
        do {
            let tip = try tipOf(uri)
            print("\nTip of \(uri): \(tip)")
            return (uri, tip)
        } catch {
            refusals[uri] = error
        }
    }
    throw ChainFailure(description: "no \(chain) server answered: \(refusals)")
}

/// Returns the sync status of the open wallet, or the reason it is unavailable.
private func syncStatusOrReason() -> String {
    do {
        return try statusSync()
    } catch {
        return "status unavailable: \(error)"
    }
}

/// Whether the running session has reached the chain tip it found.
private func syncHasCaughtUp() throws -> Bool {
    return try syncCaughtUp().range(of: "\"caught_up\":\\s*true", options: .regularExpression) != nil
}

/// Stops the session and polls each second until it has ended. Sync is continuous, so a session never ends on its own.
private func stopSyncAndWait() throws {
    _ = try stopSync()
    while try pollSync().lowercased().hasPrefix("sync task is not complete") {
        Thread.sleep(forTimeInterval: 1.0)
    }
}

/// Launches a sync of `what`, polls it each second until it reaches the tip and stops it, failing with the elapsed time and the sync status at the deadline or on a sync error.
private func syncToCompletion(_ what: String, deadlineSeconds: TimeInterval, start: Date) throws {
    let syncStart = Date()
    do {
        let syncJson = try runSync()
        print("\nSync:\n\(syncJson)")
        while try pollSync().lowercased().hasPrefix("sync task is not complete"), try !syncHasCaughtUp() {
            let elapsed = Date().timeIntervalSince(start)
            if elapsed > deadlineSeconds {
                throw ChainFailure(description: "the test passed its \(Int(deadlineSeconds)) s deadline after \(elapsed) s while syncing \(what): \(syncStatusOrReason())")
            }
            Thread.sleep(forTimeInterval: 1.0)
        }
        try stopSyncAndWait()
    } catch let error as ZingolibError {
        throw ChainFailure(description: "the sync of \(what) failed after \(Date().timeIntervalSince(start)) s: \(error): \(syncStatusOrReason())")
    }
    print("\nSynced \(what) in \(Date().timeIntervalSince(syncStart)) s")
}

/// Syncs every 20 seconds until the spendable shielded balance reaches `minimum`, failing at the deadline with the balance the wallet holds.
private func syncUntilSpendable(_ minimum: Int64, deadlineSeconds: TimeInterval, start: Date) throws {
    while true {
        let spendable: SpendableBalance = try decodeJSON(try getSpendableBalanceTotal())
        if spendable.spendable_balance >= minimum {
            return
        }
        if Date().timeIntervalSince(start) > deadlineSeconds {
            throw ChainFailure(description: "the fixture wallet held \(spendable.spendable_balance) spendable zatoshis of the \(minimum) the test needs at its \(Int(deadlineSeconds)) s deadline: \(try getBalance())")
        }
        Thread.sleep(forTimeInterval: 20.0)
        try syncToCompletion("the blocks mined while a spend from the published seed confirms", deadlineSeconds: deadlineSeconds, start: start)
    }
}

/// Opens the fixture wallet on the first answering testnet server, syncs it from its birthday to the tip, and returns that tip.
private func syncFixtureWallet(start: Date) throws -> UInt64 {
    let (serveruri, tip) = try firstAnsweringServer("testnet", TestnetFixture.SERVERS)

    let initJson = try initFromSeed(seed: TestnetFixture.SEED, birthday: UInt32(TestnetFixture.BIRTHDAY), connection: IndexerConnection(indexer: .named(uri: serveruri), chainHint: TestnetFixture.CHAIN_HINT, sync: SyncSettings(performanceLevel: "Medium", minConfirmations: UInt32(1))))
    print("\nInit from seed:\n\(initJson)")
    let initRes: InitFromSeed = try decodeJSON(initJson)
    XCTAssertEqual(initRes.seed_phrase, TestnetFixture.SEED)
    XCTAssertEqual(initRes.birthday, TestnetFixture.BIRTHDAY)

    let infoJson = try infoServer()
    print("\nInfo:\n\(infoJson)")
    let info: Info = try decodeJSON(infoJson)
    XCTAssertGreaterThanOrEqual(info.latest_block_height, tip - TestnetFixture.TIP_SKEW_BLOCKS)

    try syncToCompletion("\(tip - TestnetFixture.BIRTHDAY) testnet blocks", deadlineSeconds: PublicChain.DEADLINE_SECONDS, start: start)
    return tip
}

/// Runs `attempt`, which must refuse for want of a mixnet, and returns the refusal message, failing when it answers.
private func refusedWithoutMixnet<T>(_ what: String, _ attempt: () throws -> T) throws -> String {
    do {
        let answered = try attempt()
        throw ChainFailure(description: "the \(what) answered without a mixnet: \(answered)")
    } catch ZingolibError.Mixnet(let message) {
        print("\nThe \(what) refused without a mixnet:\n\(message)")
        return message
    }
}

final class ExecuteAddressesFromSeed: XCTestCase {
    func testExecuteAddressesFromSeed() throws {

        let seed = Seeds.HOSPITAL

        do {
            let initJson = try initFromSeed(seed: seed, birthday:UInt32(1), connection: IndexerConnection(indexer: .offline, chainHint: "regtest", sync: SyncSettings(performanceLevel: "Medium", minConfirmations: UInt32(1))))
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
          let initJson = try initFromUfvk(ufvk: ufvk, birthday: UInt32(1), connection: IndexerConnection(indexer: .offline, chainHint: "regtest", sync: SyncSettings(performanceLevel: "Medium", minConfirmations: UInt32(1))))
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
          let initJson = try initFromSeed(seed: seed, birthday: UInt32(1), connection: IndexerConnection(indexer: .offline, chainHint: "regtest", sync: SyncSettings(performanceLevel: "Medium", minConfirmations: UInt32(1))))
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
            let zingolibPart = "[0-9A-Za-z.+-]+_[0-9a-f]{16}(_dirty)?"
            // The zm_ part is the app build's, joined by RPCModule.
            XCTAssertNotNil(version.range(of: "^zl_\(zingolibPart)$", options: .regularExpression), version)
        } catch {
          XCTFail("\nVersion error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteSyncFromSeed: XCTestCase {
    func testExecuteSyncFromSeed() throws {
        let window: UInt64 = 10_000
        let tipSkewBlocks: UInt64 = 1
        let seed = Seeds.HOSPITAL
        let start = Date()

        let (serveruri, tip) = try firstAnsweringServer("mainnet", MainnetServers.SERVERS)

        let birthday = tip - window
        let initJson = try initFromSeed(seed: seed, birthday: UInt32(birthday), connection: IndexerConnection(indexer: .named(uri: serveruri), chainHint: "main", sync: SyncSettings(performanceLevel: "Medium", minConfirmations: UInt32(1))))
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

        try syncToCompletion("\(window) mainnet blocks", deadlineSeconds: PublicChain.DEADLINE_SECONDS, start: start)

        let hPostJson = try getLatestBlockWallet()
        print("\nHeight post-sync:\n\(hPostJson)")
        let hPost: Height = try decodeJSON(hPostJson)
        XCTAssertGreaterThanOrEqual(hPost.height, info.latest_block_height)
    }
}

final class ConfirmRefusesWithoutMixnet: XCTestCase {
    func testConfirmRefusesWithoutMixnet() throws {
        let amount: Int64 = 100_000
        let fee: Int64 = 20_000
        let start = Date()

        let tip = try syncFixtureWallet(start: start)

        let addrsJson = try getUnifiedAddresses()
        print("\nAddresses:\n\(addrsJson)")
        let addrs: [UnifiedAddress] = try decodeJSON(addrsJson)
        XCTAssertEqual(try XCTUnwrap(addrs.first).encoded_address, TestnetFixture.UNIFIED_ADDRESS)

        let tAddrsJson = try getTransparentAddresses()
        print("\nT Addresses:\n\(tAddrsJson)")
        let tAddrs: [TransparentAddress] = try decodeJSON(tAddrsJson)
        XCTAssertEqual(try XCTUnwrap(tAddrs.first).encoded_address, TestnetFixture.TRANSPARENT_ADDRESS)

        let hPostJson = try getLatestBlockWallet()
        print("\nHeight post-sync:\n\(hPostJson)")
        let hPost: Height = try decodeJSON(hPostJson)
        XCTAssertGreaterThanOrEqual(hPost.height, tip - TestnetFixture.TIP_SKEW_BLOCKS)

        let vts: ValueTransfers = try decodeJSON(try getValueTransfers())
        XCTAssertTrue(vts.value_transfers.map(\.txid).contains(TestnetFixture.CONSOLIDATION_TXID))

        try syncUntilSpendable(amount + fee, deadlineSeconds: PublicChain.DEADLINE_SECONDS, start: start)

        let balPreJson = try getBalance()
        print("\nBalance pre-send:\n\(balPreJson)")
        let balPre: Balance = try decodeJSON(balPreJson)

        let sendBodyData = try JSONEncoder().encode([SendResult(address: TestnetFixture.TRANSPARENT_ADDRESS, amount: amount, memo: nil)])
        let proposeJson = try send(sendJson: String(decoding: sendBodyData, as: UTF8.self))
        print("\nPropose:\n\(proposeJson)")

        let refusal = try refusedWithoutMixnet("transmission") { try confirm() }
        XCTAssertTrue(refusal.contains("the Nym mixnet is not enabled"), refusal)

        do {
            let txid = try confirm()
            XCTFail("\nA consumed proposal confirmed on retry:\n\(txid)")
            return
        } catch ZingolibError.Send(let message) {
            print("\nRetry after the refusal:\n\(message)")
        }

        try syncToCompletion("the blocks mined since the first sync", deadlineSeconds: PublicChain.DEADLINE_SECONDS, start: start)

        let balPostJson = try getBalance()
        print("\nBalance post-refusal:\n\(balPostJson)")
        let balPost: Balance = try decodeJSON(balPostJson)
        XCTAssertEqual(balPost.confirmed_transparent_balance, balPre.confirmed_transparent_balance)
    }
}

final class RecoversConsolidationTransfer: XCTestCase {
    func testRecoversConsolidationTransfer() throws {
        _ = try syncFixtureWallet(start: Date())

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
          let initJson = try initFromSeed(seed: seed, birthday: UInt32(1), connection: IndexerConnection(indexer: .offline, chainHint: "regtest", sync: SyncSettings(performanceLevel: "Medium", minConfirmations: UInt32(1))))
          print("\nInit from seed:\n\(initJson)")
          let initRes: InitFromSeed = try decodeJSON(initJson)
          XCTAssertEqual(initRes.seed_phrase, seed)
        } catch {
          XCTFail("\nInit from seed error:\n\(error.localizedDescription)")
          return
        }

        _ = try refusedWithoutMixnet("price fetch") { try zecPrice() }
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
        (ZingolibError.SendAfterDeshield(message: "boom"), "SendAfterDeshield"),
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
        (ZingolibError.WalletChainMismatch(message: "boom"), "WalletChainMismatch"),
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

    func testTheBackupAndTheBrokenCopyAreExcludedAtStartup() throws {
        let rpc = RPCModule()
        let fm = FileManager.default
        try fm.createDirectory(
            atPath: rpc.getDocumentsDirectory(),
            withIntermediateDirectories: true
        )
        let paths = try [
            rpc.getFileName(Constants.WalletBackupFileName.rawValue),
            rpc.getFileName("\(Constants.WalletFileName.rawValue).broken"),
        ]
        for path in paths {
            try "d2FsbGV0".write(toFile: path, atomically: true, encoding: .utf8)
        }
        defer { paths.forEach { try? fm.removeItem(atPath: $0) } }

        rpc.applyWalletFileProtection()

        for path in paths {
            let excluded = try URL(fileURLWithPath: path)
                .resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
            XCTAssertEqual(excluded, true, path)
        }
    }

    func testAWalletWriteLeavesTheNewFileExcluded() throws {
        let rpc = RPCModule()
        let fm = FileManager.default
        try fm.createDirectory(
            atPath: rpc.getDocumentsDirectory(),
            withIntermediateDirectories: true
        )
        let path = try rpc.getFileName(Constants.WalletBackupFileName.rawValue)
        defer { try? fm.removeItem(atPath: path) }

        try rpc.writeFile(Constants.WalletBackupFileName.rawValue, walletBytes: Data([42, 0, 0, 0]))

        let excluded = try URL(fileURLWithPath: path)
            .resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
        XCTAssertEqual(excluded, true)
        XCTAssertTrue(rpc.excludeFromBackup(path))
    }

    func testAMissingWalletFileIsANoOp() throws {
        let rpc = RPCModule()
        let fm = FileManager.default
        if let path = try? rpc.getFileName(Constants.WalletFileName.rawValue) {
            try? fm.removeItem(atPath: path)
        }
        rpc.applyWalletFileProtection()
    }
}

/// The diagnosis behind the recovery dialog, and the migration from the
/// legacy base64 text format to raw wallet bytes.
class WalletFileDiagnosisTests: XCTestCase {
    private func mainEntry(_ rpc: RPCModule) -> [String: Any]? {
        rpc.walletFileDiagnosis().first { $0["name"] as? String == WalletStore.walletName }
    }

    private func mainPath(_ rpc: RPCModule) throws -> String {
        try FileManager.default.createDirectory(
            atPath: rpc.getDocumentsDirectory(),
            withIntermediateDirectories: true
        )
        return try rpc.getFileName(Constants.WalletFileName.rawValue)
    }

    override func setUp() {
        super.setUp()
        if let documents = try? RPCModule().getDocumentsDirectory() {
            try? FileManager.default.removeItem(atPath: WalletStore.root(documents))
        }
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
            seed: Seeds.HOSPITAL, birthday: UInt32(2_000_000), connection: IndexerConnection(indexer: .offline, chainHint: "main", sync: SyncSettings(performanceLevel: "Medium", minConfirmations: UInt32(1))))
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

/// The legacy wallet and backup swap recovered from every interruption
/// window, the save refused while no wallet file is open, and the delete of
/// the active wallet's folder.
class WalletSwapRecoveryTests: XCTestCase {
    let walletA = "walletA"
    let walletB = "walletB"
    let walletC = "walletC"

    override func tearDown() {
        let rpc = RPCModule()
        let fm = FileManager.default
        for name in [Constants.WalletFileName.rawValue,
                     Constants.WalletBackupFileName.rawValue,
                     Constants.WalletTempSwapFileName.rawValue] {
            if let path = try? rpc.getFileName(name) {
                try? fm.removeItem(atPath: path)
            }
        }
        if let documents = try? rpc.getDocumentsDirectory() {
            try? fm.removeItem(atPath: WalletStore.root(documents))
        }
        RPCModule.openWalletId = nil
        RPCModule.pendingMeta = nil
        super.tearDown()
    }

    /// An active wallet folder holding `content`, as a committed create leaves it.
    private func activeWallet(_ rpc: RPCModule, _ content: String) throws -> String {
        let documents = try rpc.getDocumentsDirectory()
        let id = try WalletStore.allocate(documents)
        try content.write(toFile: WalletStore.walletPath(documents, id), atomically: true, encoding: .utf8)
        try WalletStore.writeMeta(documents, id, WalletStore.newMeta(documents, id, name: "Wallet 1", chain: "main", serverUri: ""))
        try WalletStore.setActive(documents, id)
        return id
    }

    func testASaveWithNoWalletFileOpenIsRefused() throws {
        let rpc = RPCModule()
        let id = try activeWallet(rpc, walletA)
        let path = WalletStore.walletPath(try rpc.getDocumentsDirectory(), id)

        RPCModule.openWalletId = nil
        try rpc.saveWalletInternal()

        XCTAssertEqual(try read(path), walletA)
    }

    func testDeleteClosesTheWalletFileAndRemovesItsFolder() throws {
        let rpc = RPCModule()
        let id = try activeWallet(rpc, walletA)
        let documents = try rpc.getDocumentsDirectory()
        RPCModule.openWalletId = id
        try walletA.write(toFile: "\(WalletStore.walletPath(documents, id)).broken", atomically: true, encoding: .utf8)

        XCTAssertTrue(try rpc.fnDeleteWallet(walletId: id))

        XCTAssertNil(RPCModule.openWalletId)
        XCTAssertFalse(FileManager.default.fileExists(atPath: WalletStore.dir(documents, id)))
        XCTAssertNil(WalletStore.active(documents))
    }

    func testDeleteKeepsTheOtherWallets() throws {
        let rpc = RPCModule()
        let documents = try rpc.getDocumentsDirectory()
        let first = try activeWallet(rpc, walletA)
        let second = try activeWallet(rpc, walletB)

        XCTAssertTrue(try rpc.fnDeleteWallet(walletId: second))

        XCTAssertTrue(FileManager.default.fileExists(atPath: WalletStore.dir(documents, first)))
        XCTAssertFalse(FileManager.default.fileExists(atPath: WalletStore.dir(documents, second)))
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
}

/// The folder layout under a scratch directory: commits, crash sweeps,
/// deletes and the move of the legacy files into folders.
class WalletStoreTests: XCTestCase {
    private var base = ""

    override func setUpWithError() throws {
        base = (NSTemporaryDirectory() as NSString).appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(atPath: base, withIntermediateDirectories: true)
    }

    override func tearDown() {
        try? FileManager.default.removeItem(atPath: base)
        super.tearDown()
    }

    private func committed(_ name: String) throws -> String {
        let id = try WalletStore.allocate(base)
        try Data(name.utf8).write(to: URL(fileURLWithPath: WalletStore.walletPath(base, id)))
        try WalletStore.writeMeta(base, id, WalletStore.newMeta(base, id, name: name, chain: "main", serverUri: nil))
        return id
    }

    private func legacy(_ name: String, _ content: String) throws {
        try content.write(toFile: "\(base)/\(name)", atomically: true, encoding: .utf8)
    }

    func testAWalletIsListedOnceItsMetaIsWritten() throws {
        let id = try WalletStore.allocate(base)
        try Data("w".utf8).write(to: URL(fileURLWithPath: WalletStore.walletPath(base, id)))
        XCTAssertTrue(WalletStore.list(base).isEmpty)

        try WalletStore.writeMeta(base, id, WalletStore.newMeta(base, id, name: "Wallet 1", chain: "main", serverUri: nil))

        XCTAssertEqual(WalletStore.list(base).map(\.id), [id])
    }

    func testTheSweepDropsAFolderWhoseMetaNeverLanded() throws {
        let kept = try committed("Wallet 1")
        let unfinished = try WalletStore.allocate(base)

        WalletStore.sweep(base, keep: nil)

        XCTAssertTrue(FileManager.default.fileExists(atPath: WalletStore.dir(base, kept)))
        XCTAssertFalse(FileManager.default.fileExists(atPath: WalletStore.dir(base, unfinished)))
    }

    func testTheSweepKeepsTheFolderOfTheWalletBeingCreated() throws {
        let creating = try WalletStore.allocate(base)

        WalletStore.sweep(base, keep: creating)

        XCTAssertTrue(FileManager.default.fileExists(atPath: WalletStore.dir(base, creating)))
    }

    func testTheSweepKeepsAMetaWhoseWalletFileIsMissing() throws {
        let id = try committed("Wallet 1")
        try FileManager.default.removeItem(atPath: WalletStore.walletPath(base, id))

        WalletStore.sweep(base, keep: nil)

        XCTAssertEqual(WalletStore.list(base).map(\.hasFile), [false])
    }

    func testTheSweepEndsADeleteACrashInterrupted() throws {
        let id = try committed("Wallet 1")
        try FileManager.default.moveItem(atPath: WalletStore.dir(base, id), toPath: WalletStore.dir(base, "\(id).deleting"))

        WalletStore.sweep(base, keep: nil)

        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: WalletStore.root(base)), [])
    }

    func testDeletingTheActiveWalletClearsThePointer() throws {
        let id = try committed("Wallet 1")
        try WalletStore.setActive(base, id)

        XCTAssertTrue(try WalletStore.delete(base, id))

        XCTAssertNil(WalletStore.active(base))
    }

    func testTheDefaultNameTakesTheLowestFreeNumber() throws {
        _ = try committed("Wallet 1")
        _ = try committed("Wallet 3")

        XCTAssertEqual(WalletStore.defaultName(base), "Wallet 2")
    }

    func testALegacyWalletAndBackupMoveIntoFoldersWithTheWalletActive() throws {
        try legacy("wallet.dat.txt", "main")
        try legacy("wallet.backup.dat.txt", "backup")

        let main = try WalletStore.adoptLegacy(base, legacy: "wallet.dat.txt", name: "Wallet 1", active: true, chain: "main", serverUri: "https://zec.example")
        let backup = try WalletStore.adoptLegacy(base, legacy: "wallet.backup.dat.txt", name: "Wallet Backup", active: false, chain: "main", serverUri: nil)

        XCTAssertEqual(WalletStore.active(base), main)
        XCTAssertEqual(WalletStore.list(base).compactMap { $0.meta["name"] as? String }, ["Wallet 1", "Wallet Backup"])
        XCTAssertEqual(try String(contentsOfFile: WalletStore.walletPath(base, try XCTUnwrap(backup)), encoding: .utf8), "backup")
        XCTAssertFalse(FileManager.default.fileExists(atPath: "\(base)/wallet.dat.txt"))
        XCTAssertFalse(FileManager.default.fileExists(atPath: "\(base)/wallet.backup.dat.txt"))
    }

    func testALegacyWalletTakesTheLowestFreeNameWhenItsOwnIsInUse() throws {
        let open = try committed("Wallet 1")
        try WalletStore.setActive(base, open)
        try legacy("wallet.dat.txt", "main")

        let id = try XCTUnwrap(try WalletStore.adoptLegacy(base, legacy: "wallet.dat.txt", name: "Wallet 1", active: true, chain: "main", serverUri: nil))

        XCTAssertEqual(WalletStore.list(base).first(where: { $0.id == id })?.meta["name"] as? String, "Wallet 2")
        XCTAssertEqual(WalletStore.active(base), open)
    }

    func testAMigrationResumesIntoTheSameFolderWhenACrashLeftTheFileBehind() throws {
        try legacy("wallet.dat.txt", "main")
        let id = try WalletStore.allocate(base)
        var meta = WalletStore.newMeta(base, id, name: "Wallet 1", chain: "main", serverUri: nil)
        meta["migratedFrom"] = WalletStore.digest(Data("main".utf8))
        try WalletStore.writeMeta(base, id, meta)
        try WalletStore.setActive(base, id)

        let resumed = try WalletStore.adoptLegacy(base, legacy: "wallet.dat.txt", name: "Wallet 1", active: true, chain: "main", serverUri: nil)

        XCTAssertEqual(resumed, id)
        XCTAssertEqual(WalletStore.list(base).count, 1)
        XCTAssertEqual(try String(contentsOfFile: WalletStore.walletPath(base, id), encoding: .utf8), "main")
    }

    func testNothingMovesWhenNoLegacyFileExists() throws {
        XCTAssertNil(try WalletStore.adoptLegacy(base, legacy: "wallet.dat.txt", name: "Wallet 1", active: true, chain: "main", serverUri: nil))
    }

    func testAPatchSetsAndRemovesFieldsButNeverTheStoresOwn() throws {
        let id = try committed("Wallet 1")
        var meta = WalletStore.list(base)[0].meta
        meta["migratedFrom"] = "abc"
        meta["category"] = 2

        let patched = WalletStore.patchMeta(meta, [
            "name": "Savings", "category": NSNull(), "id": "other", "v": 9, "migratedFrom": "def",
        ])

        XCTAssertEqual(patched["name"] as? String, "Savings")
        XCTAssertNil(patched["category"])
        XCTAssertEqual(patched["id"] as? String, id)
        XCTAssertEqual(patched["v"] as? Int, 1)
        XCTAssertEqual(patched["migratedFrom"] as? String, "abc")
    }

    func testANewWalletsMetaCarriesItsKindWhenGiven() throws {
        let id = try WalletStore.allocate(base)

        XCTAssertEqual(WalletStore.newMeta(base, id, name: "Wallet 1", chain: "main", serverUri: nil, kind: "ufvk")["kind"] as? String, "ufvk")
        XCTAssertNil(WalletStore.newMeta(base, id, name: "Wallet 1", chain: "main", serverUri: nil)["kind"])
    }

    func testTheInfoListsTheWalletsInOrderWithTheActiveOne() throws {
        let first = try committed("Wallet 1")
        let second = try committed("Wallet 2")
        try WalletStore.setActive(base, second)

        let info = WalletStore.info(base)
        let wallets = info["wallets"] as? [[String: Any]] ?? []

        XCTAssertEqual(info["active"] as? String, second)
        XCTAssertEqual(wallets.map { $0["id"] as? String }, [first, second])
        XCTAssertEqual((wallets[1]["meta"] as? [String: Any])?["name"] as? String, "Wallet 2")
        XCTAssertNotNil(try JSONSerialization.data(withJSONObject: info))
    }

    func testTheInfoReportsNoActiveWalletAsNullWhenThereIsNone() throws {
        XCTAssertTrue(WalletStore.info(base)["active"] is NSNull)
    }

    func testTheFirstWalletIsTheActiveOneWhenThePointerNamesNone() throws {
        let first = try committed("Wallet 1")
        let second = try committed("Wallet 2")
        try WalletStore.setActive(base, second)

        _ = try WalletStore.delete(base, second)

        XCTAssertEqual(WalletStore.active(base), first)
    }

    func testTheLargestWalletIsTheBiggestFileOnDisk() throws {
        _ = try committed("Wallet 1")
        let big = try committed("Wallet 2")
        try Data(count: 500).write(to: URL(fileURLWithPath: WalletStore.walletPath(base, big)))

        XCTAssertEqual(WalletStore.largestWallet(base), 500)
    }

    func testAFullStorageIsToldApartFromOtherWriteFailures() {
        let posix = NSError(domain: NSPOSIXErrorDomain, code: Int(ENOSPC))
        let wrapped = NSError(domain: NSCocoaErrorDomain, code: NSFileWriteUnknownError, userInfo: [NSUnderlyingErrorKey: posix])

        XCTAssertTrue(WalletStore.isDiskFull(NSError(domain: NSCocoaErrorDomain, code: NSFileWriteOutOfSpaceError)))
        XCTAssertTrue(WalletStore.isDiskFull(wrapped))
        XCTAssertFalse(WalletStore.isDiskFull(NSError(domain: NSCocoaErrorDomain, code: NSFileWriteNoPermissionError)))
    }

    func testAFullStorageRejectsAsDiskFull() {
        guard case .rejected(let code, _, _) = FfiOutcome.of({ throw StorageError.diskFull("full") }) else {
            return XCTFail("a full storage resolved")
        }
        XCTAssertEqual(code, "DiskFull")
    }
}
