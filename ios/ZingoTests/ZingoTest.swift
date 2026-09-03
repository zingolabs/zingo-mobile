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
    let session_ironwood_outputs_scanned: UInt64?
    let total_ironwood_outputs_scanned: UInt64?
    let percentage_session_outputs_scanned: Double?
    let percentage_total_outputs_scanned: Double?
    let total_outputs_scanned: UInt64?
    let total_outputs: UInt64?
}

struct Balance: Codable {
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

final class ExecuteAddressesFromSeed: XCTestCase {
    func testExecuteAddressesFromSeed() throws {
        setCryptoProvider()

        let serveruri = "http://127.0.0.1:20000"
        let chainhint = "regtest"
        let seed = Seeds.HOSPITAL

        do {
            let initJson = try initFromSeed(seed: seed, birthday:UInt32(1), serveruri: serveruri, chainhint: chainhint, performancelevel: "Medium", minconfirmations: UInt32(1))
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
            let addrsJson = try getUnifiedAddresses()
            print("\nAddresses:\n\(addrsJson)")
            let addrs: [UnifiedAddress] = try decodeJSON(addrsJson)
            XCTAssertEqual(addrs[0].encoded_address, "u1gsqvqxx6lmmqg05uvx57gjdg5j3a54nxw09z4vq4z0yp7dfdcjrqk5wq64quwzrufmujd5e8xu5jn7cyewjaptxc8lsqwa2lk559u4cd")
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
          return
        }
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
            XCTAssertEqual(addrs[0].encoded_address, "u1gsqvqxx6lmmqg05uvx57gjdg5j3a54nxw09z4vq4z0yp7dfdcjrqk5wq64quwzrufmujd5e8xu5jn7cyewjaptxc8lsqwa2lk559u4cd")
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
          return
        }

    }
}

final class ExecuteVersionFromSeed: XCTestCase {
    func testExecuteVersionFromSeed() throws {
        setCryptoProvider()
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
            let hPreJson = try getLatestBlockWallet()
            print("\nHeight pre-sync:\n\(hPreJson)")
            let hPre: Height = try decodeJSON(hPreJson)
            XCTAssertEqual(hPre.height, 0)
        } catch {
          XCTFail("\nHeight pre-sync error:\n\(error.localizedDescription)")
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
            let hPostJson = try getLatestBlockWallet()
            print("\nHeight post-sync:\n\(hPostJson)")
            let hPost: Height = try decodeJSON(hPostJson)
            XCTAssertEqual(hPost.height, latest_block_height)
        } catch {
          XCTFail("\nHeight post-sync error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteSendFromOrchard: XCTestCase {
    func testExecuteSendFromOrchard() throws {
        setCryptoProvider()
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
            let balJson = try getBalance()
            print("\nBalance pre-send:\n\(balJson)")
            let bal: Balance = try decodeJSON(balJson)
            XCTAssertEqual(bal.confirmed_orchard_balance, 1_000_000)
            XCTAssertEqual(bal.confirmed_transparent_balance, 0)
        } catch {
          XCTFail("\nBalance pre-send error:\n\(error.localizedDescription)")
          return
        }

        var taddr: String? = nil
        do {
            let tAddrsJson = try getTransparentAddresses()
            print("\nT Addresses:\n\(tAddrsJson)")
            let tAddrs: [TransparentAddress] = try decodeJSON(tAddrsJson)
            guard let addr = tAddrs.first?.encoded_address else {
                XCTFail("No transparent address")
                return
            }
            taddr = addr
        } catch {
          XCTFail("\nT Addresses error:\n\(error.localizedDescription)")
          return
        }

        let ta = try XCTUnwrap(taddr, "T address is nil")
        XCTAssertFalse(ta.isEmpty, "T address is empty")
      
        do {
          let sendJson = SendResult(address: ta, amount: 100_000, memo: nil)
          let sendBodyData = try JSONEncoder().encode([sendJson])
          let sendBody = String(data: sendBodyData, encoding: .utf8)!
          let proposeJson = try send(sendJson: sendBody)
          print("\nPropose:\n\(proposeJson)")
        } catch {
          XCTFail("\nPropose error:\n\(error.localizedDescription)")
          return
        }
        
        // The transmission rides the mixnet or does not happen (ADR 0011).
        // This wallet never attached one, so the confirm must refuse. A txid
        // here would mean the transaction reached an indexer over clearnet,
        // which is the leak the mixnet-only rule exists to prevent.
        do {
          let confirmJson = try confirm()
          XCTFail("\nThe transmission answered without a mixnet:\n\(confirmJson)")
          return
        } catch ZingolibError.Mixnet(let message) {
          print("\nTransmission refused without a mixnet:\n\(message)")
          // The refusal names the unattached state, because waiting out a
          // bootstrap and restarting a dead proxy are different remedies.
          XCTAssertTrue(
            message.contains("the Nym mixnet is not enabled"),
            "The refusal must name the unattached state:\n\(message)"
          )
        } catch {
          XCTFail("\nThe transmission failed without refusing:\n\(error.localizedDescription)")
          return
        }
        
        do {
            let syncJson2 = try runSync()
            print("\nSync:\n\(syncJson2)")
        } catch {
            print("\nSync error:\n\(error.localizedDescription)")
        }

        waitForSyncOrFail()

        do {
            let balJson = try getBalance()
            print("\nBalance post-refusal:\n\(balJson)")
            let bal: Balance = try decodeJSON(balJson)
            // Nothing reached the chain, so the transparent recipient holds
            // no confirmed funds. The unconfirmed side is deliberately
            // unasserted: the proposal is still Calculated, and a Calculated
            // transaction counts as pending whether or not it was ever
            // transmitted.
            XCTAssertEqual(bal.confirmed_transparent_balance, 0)
        } catch {
          XCTFail("\nBalance post-refusal error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class UpdateCurrentPriceAndValueTransfersFromSeed: XCTestCase {
    func testUpdateCurrentPriceAndValueTransfersFromSeed() throws {
        setCryptoProvider()

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

        // Price rides the mixnet or does not happen (ADR 0011). This wallet
        // never attached one, so the fetch must refuse. A price here would
        // mean the wallet reached an oracle over clearnet, which is the
        // leak the mixnet-only rule exists to prevent.
        do {
          let price = try zecPrice()
          XCTFail("\nThe price fetch answered without a mixnet:\n\(price)")
          return
        } catch {
          print("\nPrice refused without a mixnet:\n\(error.localizedDescription)")
        }
        
        do {
            let syncJson = try runSync()
            print("\nSync:\n\(syncJson)")
        } catch {
            print("\nSync error:\n\(error.localizedDescription)")
        }

        waitForSyncOrFail()

        let recipientAddress = "uregtest1az7w9w3tdegf0srnsgqyqfhyfrpx2h6u4pkc2yq3ja552vzhwkjqgy4fu6a6kcu9280ppajamj2gcq9lx9x0zxdrsns94ml3e443a7t2dm50382mhtkleydrq74q5xlh6sel5u0qlrvflf20qgljzszd2ht9jmerwwahct9rtuc3nqdk"

        do {
            let vtJson = try getValueTransfers()
            print("\nValue Transfers:\n\(vtJson)")
            let vts: ValueTransfers = try decodeJSON(vtJson)
            XCTAssertEqual(vts.value_transfers.count, 3)

            // Orden y valores como en Kotlin
            XCTAssertEqual(vts.value_transfers[0].kind, "memo-to-self")
            XCTAssertEqual(vts.value_transfers[0].status, "confirmed")
            XCTAssertEqual(vts.value_transfers[0].value, 870_000)
            XCTAssertEqual(vts.value_transfers[0].transaction_fee, 20_000)

            XCTAssertEqual(vts.value_transfers[1].kind, "sent")
            XCTAssertEqual(vts.value_transfers[1].recipient_address, recipientAddress)
            XCTAssertEqual(vts.value_transfers[1].status, "confirmed")
            XCTAssertEqual(vts.value_transfers[1].value, 100_000)
            XCTAssertEqual(vts.value_transfers[1].transaction_fee, 10_000)

            XCTAssertEqual(vts.value_transfers[2].kind, "received")
            XCTAssertEqual(vts.value_transfers[2].pools_received, ["Orchard"])
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
        setCryptoProvider()

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

        let serveruri = "http://127.0.0.1:20000"
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

/// The legacy text format on iOS: every build before the raw-bytes format
/// stored the wallet as base64 text. A file is classified by its first
/// bytes alone, the text decodes in aligned chunks with an unfinishable
/// tail dropped, and the migration to raw bytes leaves the text file as it
/// was unless its plain replacement passes the full parse.
class WalletFileTextMigrationTests: XCTestCase {
    private let rpc = RPCModule()

    private func documents() throws -> String {
        let dir = try rpc.getDocumentsDirectory()
        try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        return dir
    }

    private func scratch(_ name: String) throws -> String {
        let path = "\(try documents())/\(name)"
        try? FileManager.default.removeItem(atPath: path)
        return path
    }

    override func tearDown() {
        let fm = FileManager.default
        if let dir = try? rpc.getDocumentsDirectory(),
           let names = try? fm.contentsOfDirectory(atPath: dir) {
            for name in names where name.hasPrefix("wallet") || name.hasPrefix("text-") {
                try? fm.removeItem(atPath: "\(dir)/\(name)")
            }
        }
        RPCModule.walletFileClosed = false
        super.tearDown()
    }

    // A real offline wallet's raw bytes, streamed through the save entry
    // point into a scratch file.
    private func savedWalletBytes() throws -> Data {
        setCryptoProvider()
        _ = try initFromSeed(seed: Seeds.HOSPITAL, birthday: 2_000_000, serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: 1)
        let path = try scratch("text-fixture.dat")
        XCTAssertTrue(try saveWalletFile(tempPath: path))
        defer { try? FileManager.default.removeItem(atPath: path) }
        return try Data(contentsOf: URL(fileURLWithPath: path))
    }

    func testTheFormatIsToldApartByTheFirstBytes() throws {
        let raw = try scratch("text-raw.dat")
        var wallet = Data([42, 0, 0, 0, 0, 0, 0, 0])
        wallet.append(Data(repeating: 7, count: 64))
        try wallet.write(to: URL(fileURLWithPath: raw))
        XCTAssertEqual(PlainWalletFile.format(raw), .plainWallet)

        let text = try scratch("text-b64.dat")
        try wallet.base64EncodedString().write(toFile: text, atomically: true, encoding: .utf8)
        XCTAssertEqual(PlainWalletFile.format(text), .base64Text)

        let garbage = try scratch("text-garbage.dat")
        try "!!!not-base64!!!".write(toFile: garbage, atomically: true, encoding: .utf8)
        XCTAssertEqual(PlainWalletFile.format(garbage), .unknown)

        let empty = try scratch("text-empty.dat")
        FileManager.default.createFile(atPath: empty, contents: nil)
        XCTAssertEqual(PlainWalletFile.format(empty), .unknown)
        XCTAssertEqual(PlainWalletFile.format(try scratch("text-missing.dat")), .unknown)
    }

    func testTheChunkedDecodeMatchesFoundationAcrossChunkBoundaries() throws {
        // 64 KiB of text decodes to 48 KiB, so these sizes straddle the
        // chunk edge and end on every padding length.
        for size in [1, 2, 3, 49_151, 49_152, 49_153, 150_001] {
            var bytes = Data(count: size)
            for i in 0..<size { bytes[i] = UInt8((i * 31 + 7) & 0xff) }
            let text = try scratch("text-in.dat")
            let raw = try scratch("text-out.dat")
            try bytes.base64EncodedString().write(toFile: text, atomically: true, encoding: .utf8)

            try PlainWalletFile.decodeBase64Text(from: text, to: raw)

            XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: raw)), bytes, "size \(size)")
        }
    }

    func testAnUnfinishableTailIsDropped() throws {
        let text = try scratch("text-cut.dat")
        let raw = try scratch("text-cut-out.dat")
        // 12 characters encode 9 bytes; cutting to 11 leaves 8 usable.
        try "KgAAAAAAAAA".write(toFile: text, atomically: true, encoding: .utf8)

        try PlainWalletFile.decodeBase64Text(from: text, to: raw)

        XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: raw)), Data([42, 0, 0, 0, 0, 0]))
    }

    func testTextThatIsNotBase64FailsTheDecode() throws {
        let text = try scratch("text-bad.dat")
        let raw = try scratch("text-bad-out.dat")
        try "KgAA!!!!".write(toFile: text, atomically: true, encoding: .utf8)
        XCTAssertThrowsError(try PlainWalletFile.decodeBase64Text(from: text, to: raw))
    }

    func testALegacyTextWalletMigratesToRawBytesOnResolve() throws {
        let wallet = try savedWalletBytes()
        let main = try rpc.getFileName(Constants.WalletFileName.rawValue)
        try wallet.base64EncodedString().write(toFile: main, atomically: true, encoding: .utf8)

        XCTAssertEqual(try rpc.resolveWalletFile(Constants.WalletFileName.rawValue), main)

        XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: main)), wallet)
        XCTAssertFalse(FileManager.default.fileExists(atPath: PlainWalletFile.tempPath(main)))
        let excluded = try URL(fileURLWithPath: main)
            .resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
        XCTAssertEqual(excluded, true)
        let seed = try rpc.fnLoadExistingWallet(serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: "1")
        XCTAssertTrue(seed.contains(Seeds.HOSPITAL))
    }

    func testARawWalletResolvesWithoutARewrite() throws {
        let wallet = try savedWalletBytes()
        let main = try rpc.getFileName(Constants.WalletFileName.rawValue)
        try wallet.write(to: URL(fileURLWithPath: main))
        let before = try FileManager.default.attributesOfItem(atPath: main)[.modificationDate] as? Date

        XCTAssertEqual(try rpc.resolveWalletFile(Constants.WalletFileName.rawValue), main)

        let after = try FileManager.default.attributesOfItem(atPath: main)[.modificationDate] as? Date
        XCTAssertEqual(before, after)
        XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: main)), wallet)
    }

    func testATextWalletThatFailsTheParseStaysUntouched() throws {
        let wallet = try savedWalletBytes()
        let main = try rpc.getFileName(Constants.WalletFileName.rawValue)
        let truncated = wallet.prefix(wallet.count / 2).base64EncodedString()
        try truncated.write(toFile: main, atomically: true, encoding: .utf8)

        XCTAssertThrowsError(try rpc.resolveWalletFile(Constants.WalletFileName.rawValue))

        XCTAssertEqual(try String(contentsOfFile: main, encoding: .utf8), truncated)
        XCTAssertFalse(FileManager.default.fileExists(atPath: PlainWalletFile.tempPath(main)))
        XCTAssertEqual(rpc.walletFileState(main), "plainWallet")
    }

    func testAStaleTempFromAnInterruptedMigrationIsReplaced() throws {
        let wallet = try savedWalletBytes()
        let main = try rpc.getFileName(Constants.WalletFileName.rawValue)
        try wallet.base64EncodedString().write(toFile: main, atomically: true, encoding: .utf8)
        try wallet.prefix(20).write(to: URL(fileURLWithPath: PlainWalletFile.tempPath(main)))

        _ = try rpc.resolveWalletFile(Constants.WalletFileName.rawValue)

        XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: main)), wallet)
        XCTAssertFalse(FileManager.default.fileExists(atPath: PlainWalletFile.tempPath(main)))
    }

    func testTheStreamingSaveWritesRawBytesTheFullParseAccepts() throws {
        setCryptoProvider()
        _ = try initFromSeed(seed: Seeds.HOSPITAL, birthday: 2_000_000, serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: 1)
        let main = try rpc.getFileName(Constants.WalletFileName.rawValue)
        try? FileManager.default.removeItem(atPath: main)
        rpc.reopenWalletFile()

        try rpc.saveWalletInternal()

        XCTAssertEqual(PlainWalletFile.format(main), .plainWallet)
        XCTAssertNoThrow(try validateWalletFile(path: main))
        XCTAssertFalse(FileManager.default.fileExists(atPath: PlainWalletFile.tempPath(main)))
        let excluded = try URL(fileURLWithPath: main)
            .resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
        XCTAssertEqual(excluded, true)
    }

    func testTheSalvageReadsALegacyTextFileCutMidQuantum() throws {
        let wallet = try savedWalletBytes()
        let main = try rpc.getFileName(Constants.WalletFileName.rawValue)
        let text = wallet.base64EncodedString()
        try String(text.prefix(text.count / 2 + 1)).write(toFile: main, atomically: true, encoding: .utf8)

        let expectation = self.expectation(description: "salvage")
        var salvaged: String?
        rpc.walletFileRecoveryInfo({ value in
            salvaged = value as? String
            expectation.fulfill()
        }, reject: { _, message, _ in
            XCTFail("salvage rejected: \(message ?? "")")
            expectation.fulfill()
        })
        wait(for: [expectation], timeout: 30)

        XCTAssertTrue(salvaged?.contains(Seeds.HOSPITAL) ?? false)
        XCTAssertTrue(FileManager.default.fileExists(atPath: "\(main).broken"))
        XCTAssertFalse(FileManager.default.fileExists(atPath: "\(main).salvage.tmp"))
    }
}

/// Peak memory of a load and a save against a synced wallet file named by
/// the `ZINGO_BENCH_WALLET` environment variable, written as one JSON
/// object to the path in `ZINGO_BENCH_OUT`: the file size and, for each
/// operation, the peak growth over the level at entry of the malloc heap
/// in use and the physical footprint. The benchmark skips when either
/// variable is absent. `scripts/bench_wallet_memory.mts` drives it.
class WalletMemoryBenchmark: XCTestCase {
    private struct Peak {
        let malloc: UInt64
        let footprint: UInt64
    }

    private static func mallocInUse() -> UInt64 {
        var stats = malloc_statistics_t()
        malloc_zone_statistics(nil, &stats)
        return UInt64(stats.size_in_use)
    }

    private static func physFootprint() -> UInt64 {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        return result == KERN_SUCCESS ? info.phys_footprint : 0
    }

    // Samples both measures every millisecond while `operation` runs and
    // reports their peak growth over the level at entry.
    private func peakDuring(_ operation: () throws -> Void) rethrows -> Peak {
        let mallocBase = Self.mallocInUse()
        let footprintBase = Self.physFootprint()
        var mallocPeak = mallocBase
        var footprintPeak = footprintBase
        let running = NSLock()
        var stop = false
        let sampler = Thread {
            while true {
                running.lock()
                let done = stop
                running.unlock()
                if done { break }
                mallocPeak = max(mallocPeak, Self.mallocInUse())
                footprintPeak = max(footprintPeak, Self.physFootprint())
                Thread.sleep(forTimeInterval: 0.001)
            }
        }
        sampler.start()
        defer {
            running.lock()
            stop = true
            running.unlock()
            while !sampler.isFinished { Thread.sleep(forTimeInterval: 0.001) }
        }
        try operation()
        return Peak(malloc: mallocPeak - mallocBase, footprint: footprintPeak - footprintBase)
    }

    func testPeakMemoryOfLoadAndSaveOnASyncedWallet() throws {
        let env = ProcessInfo.processInfo.environment
        guard let fixture = env["ZINGO_BENCH_WALLET"], let out = env["ZINGO_BENCH_OUT"] else {
            throw XCTSkip("ZINGO_BENCH_WALLET and ZINGO_BENCH_OUT are not set")
        }
        let rpc = RPCModule()
        let fm = FileManager.default
        try fm.createDirectory(atPath: rpc.getDocumentsDirectory(), withIntermediateDirectories: true)
        let main = try rpc.getFileName(Constants.WalletFileName.rawValue)
        try? fm.removeItem(atPath: main)
        try fm.copyItem(atPath: fixture, toPath: main)
        defer { try? fm.removeItem(atPath: main) }
        let size = try XCTUnwrap(fm.attributesOfItem(atPath: main)[.size] as? UInt64)
        rpc.reopenWalletFile()
        setCryptoProvider()

        let load = try peakDuring {
            _ = try rpc.fnLoadExistingWallet(serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: "1")
        }
        _ = try createNewUnifiedAddress(receivers: "o")
        let before = try fm.attributesOfItem(atPath: main)[.modificationDate] as? Date
        Thread.sleep(forTimeInterval: 0.05)
        let save = try peakDuring { try rpc.saveWalletInternal() }
        XCTAssertNotEqual(try fm.attributesOfItem(atPath: main)[.modificationDate] as? Date, before)
        try validateWalletFile(path: main)

        let report: [String: Any] = [
            "platform": "ios",
            "fileBytes": size,
            "load": ["malloc": load.malloc, "footprint": load.footprint],
            "save": ["malloc": save.malloc, "footprint": save.footprint],
        ]
        try JSONSerialization.data(withJSONObject: report).write(to: URL(fileURLWithPath: out))
    }
}

/// Adversarial scenarios against the path-based wallet persistence. Each
/// test states a rule the load, save, restore, delete, or salvage path
/// must keep and fails when the code breaks it.
class WalletAdversarialTests: XCTestCase {
    private let rpc = RPCModule()

    private func paths() throws -> (main: String, backup: String, temp: String) {
        try FileManager.default.createDirectory(atPath: rpc.getDocumentsDirectory(), withIntermediateDirectories: true)
        return (
            try rpc.getFileName(Constants.WalletFileName.rawValue),
            try rpc.getFileName(Constants.WalletBackupFileName.rawValue),
            try rpc.getFileName(Constants.WalletTempSwapFileName.rawValue)
        )
    }

    private func clearAll() throws {
        let files = try paths()
        let fm = FileManager.default
        for path in [files.main, files.backup, files.temp] {
            for suffix in ["", ".plain.tmp", ".salvage.tmp", ".broken"] {
                try? fm.removeItem(atPath: path + suffix)
            }
        }
        RPCModule.walletFileClosed = false
    }

    override func setUp() {
        super.setUp()
        try? clearAll()
        setCryptoProvider()
    }

    override func tearDown() {
        try? clearAll()
        super.tearDown()
    }

    private func savedWallet(birthday: UInt32) throws -> Data {
        _ = try initFromSeed(seed: Seeds.HOSPITAL, birthday: birthday, serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: 1)
        let path = try rpc.getFileName("adversarial-fixture.dat")
        try? FileManager.default.removeItem(atPath: path)
        XCTAssertTrue(try saveWalletFile(tempPath: path))
        defer { try? FileManager.default.removeItem(atPath: path) }
        return try Data(contentsOf: URL(fileURLWithPath: path))
    }

    private func restore() -> String? {
        let done = expectation(description: "restore")
        var outcome: String?
        rpc.restoreExistingWalletBackup({ value in
            outcome = value as? String
            done.fulfill()
        }, reject: { _, _, _ in done.fulfill() })
        wait(for: [done], timeout: 60)
        return outcome
    }

    // Rule: a restore installs the wallet it validated. An orphan swap temp
    // from an earlier crash must not be swapped in instead.
    func testTheRestoreInstallsTheFileItValidated() throws {
        let files = try paths()
        defer {
            let dir = (files.temp as NSString).deletingLastPathComponent
            let prefix = (files.temp as NSString).lastPathComponent + ".orphan."
            for name in (try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? [] where name.hasPrefix(prefix) {
                try? FileManager.default.removeItem(atPath: "\(dir)/\(name)")
            }
        }
        let good = try savedWallet(birthday: 2_000_000)
        try good.write(to: URL(fileURLWithPath: files.backup))
        var junk = Data([42, 0, 0, 0, 0, 0, 0, 0])
        junk.append(Data(repeating: 9, count: 64))
        try junk.write(to: URL(fileURLWithPath: files.main))
        try junk.write(to: URL(fileURLWithPath: files.temp))

        _ = restore()

        XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: files.main)), good)
        XCTAssertNoThrow(try validateWalletFile(path: files.main))
    }

    // Rule: a restore that reports failure reopens the wallet file for the
    // saves that follow, and keeps the orphan it could not place.
    func testAFailedRestoreReopensTheWalletFileAndKeepsTheOrphan() throws {
        let files = try paths()
        let good = try savedWallet(birthday: 2_000_000)
        let other = try savedWallet(birthday: 2_100_000)
        var junk = Data([42, 0, 0, 0, 0, 0, 0, 0])
        junk.append(Data(repeating: 9, count: 64))
        try good.write(to: URL(fileURLWithPath: files.main))
        try junk.write(to: URL(fileURLWithPath: files.backup))
        try other.write(to: URL(fileURLWithPath: files.temp))

        XCTAssertEqual(restore(), "false")

        XCTAssertFalse(RPCModule.walletFileClosed)
        XCTAssertEqual(try Data(contentsOf: URL(fileURLWithPath: files.main)), good)
        let dir = (files.temp as NSString).deletingLastPathComponent
        let orphans = try FileManager.default.contentsOfDirectory(atPath: dir)
            .filter { $0.hasPrefix((files.temp as NSString).lastPathComponent + ".orphan.") }
        XCTAssertEqual(orphans.count, 1)
        for name in orphans { try? FileManager.default.removeItem(atPath: "\(dir)/\(name)") }
    }

    // Rule: an install never sweeps a temp another writer of this process
    // is still filling.
    func testAnInstallKeepsATempAnotherWriterIsStillFilling() throws {
        let files = try paths()
        var wallet = Data([42, 0, 0, 0, 0, 0, 0, 0])
        wallet.append(Data(repeating: 7, count: 64))
        let filled = DispatchSemaphore(value: 0)
        let released = DispatchSemaphore(value: 0)
        var slowError: Error?
        let slow = expectation(description: "slow writer")
        DispatchQueue.global().async {
            do {
                _ = try PlainWalletFile.write(files.main) { temp in
                    try wallet.write(to: URL(fileURLWithPath: temp))
                    filled.signal()
                    released.wait()
                    return true
                }
            } catch {
                slowError = error
            }
            slow.fulfill()
        }
        filled.wait()
        _ = try PlainWalletFile.write(files.main) { temp in
            try wallet.write(to: URL(fileURLWithPath: temp))
            return true
        }
        released.signal()
        wait(for: [slow], timeout: 10)

        XCTAssertNil(slowError)
        XCTAssertEqual(PlainWalletFile.staleTemps(files.main), [])
    }

    // Rule: the salvage scratch copy is excluded from backup while it exists.
    func testTheSalvageScratchIsExcludedFromBackup() throws {
        let files = try paths()
        var wallet = Data([42, 0, 0, 0, 0, 0, 0, 0])
        wallet.append(Data(repeating: 7, count: 64))
        let text = "\(files.main).text-fixture"
        let raw = "\(files.main).raw-fixture"
        defer {
            try? FileManager.default.removeItem(atPath: text)
            try? FileManager.default.removeItem(atPath: raw)
        }
        try wallet.base64EncodedString().write(toFile: text, atomically: true, encoding: .utf8)

        try PlainWalletFile.decodeBase64Text(from: text, to: raw)

        let excluded = try URL(fileURLWithPath: raw)
            .resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
        XCTAssertEqual(excluded, true)
    }

    // Rule: a failed salvage decode leaves no plaintext scratch copy.
    func testAFailedSalvageDecodeLeavesNoScratchCopy() throws {
        let files = try paths()
        let text = Data(repeating: 0, count: 90_000).base64EncodedString() + "!!!!"
        try text.write(toFile: files.main, atomically: true, encoding: .utf8)

        let done = expectation(description: "salvage")
        rpc.walletFileRecoveryInfo({ _ in done.fulfill() }, reject: { _, _, _ in done.fulfill() })
        wait(for: [done], timeout: 30)

        XCTAssertFalse(FileManager.default.fileExists(atPath: "\(files.main).salvage.tmp"))
    }

    // Rule: deleting the wallet removes every plain copy beside it.
    func testDeleteRemovesThePlainAndSalvageTemps() throws {
        let files = try paths()
        let wallet = Data([42, 0, 0, 0, 0, 0, 0, 0])
        try wallet.write(to: URL(fileURLWithPath: files.main))
        try wallet.write(to: URL(fileURLWithPath: PlainWalletFile.tempPath(files.main)))
        try wallet.write(to: URL(fileURLWithPath: "\(files.main).salvage.tmp"))

        try rpc.fnDeleteExistingWallet()

        let fm = FileManager.default
        XCTAssertFalse(fm.fileExists(atPath: PlainWalletFile.tempPath(files.main)))
        XCTAssertFalse(fm.fileExists(atPath: "\(files.main).salvage.tmp"))
    }

    // Rule: a wallet file the load cannot read rejects under a typed code.
    func testAnUnreadableWalletFileRejectsTyped() throws {
        let files = try paths()
        try "!!!not-base64!!!".write(toFile: files.main, atomically: true, encoding: .utf8)

        let outcome = FfiOutcome.of {
            try self.rpc.fnLoadExistingWallet(serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: "1")
        }

        guard case .rejected(let code, _, _) = outcome else {
            return XCTFail("an unreadable wallet file must reject")
        }
        XCTAssertNotEqual(code, "Unknown")
    }

    // Rule: the temp is excluded from backup before the rename publishes it.
    func testTheRenamePublishesAnAlreadyExcludedFile() throws {
        let files = try paths()
        var temp = ""
        func excluded(_ path: String) throws -> Bool? {
            try URL(fileURLWithPath: path).resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
        }
        _ = try PlainWalletFile.write(
            files.main,
            commit: {
                XCTAssertEqual(try? excluded(temp), true)
                return true
            }
        ) { path in
            temp = path
            try Data([42, 0, 0, 0, 0, 0, 0, 0]).write(to: URL(fileURLWithPath: path))
            return true
        }
        XCTAssertEqual(try excluded(files.main), true)
    }

    // Rule: a save in flight when the user deletes the wallet must not
    // recreate the file.
    func testASaveInFlightDoesNotUndoADelete() throws {
        let files = try paths()
        let wallet = try savedWallet(birthday: 2_000_000)
        try wallet.write(to: URL(fileURLWithPath: files.main))
        _ = try createNewUnifiedAddress(receivers: "o")

        let inFill = DispatchSemaphore(value: 0)
        let release = DispatchSemaphore(value: 0)
        let saved = expectation(description: "save")
        rpc.beforeSaveFill = {
            inFill.signal()
            release.wait()
        }
        defer { rpc.beforeSaveFill = {} }
        DispatchQueue.global().async {
            try? self.rpc.saveWalletInternal()
            saved.fulfill()
        }
        inFill.wait()

        let deleted = expectation(description: "delete")
        DispatchQueue.global().async {
            try? self.rpc.fnDeleteExistingWallet()
            deleted.fulfill()
        }
        Thread.sleep(forTimeInterval: 0.3)
        release.signal()
        wait(for: [saved, deleted], timeout: 10)

        XCTAssertFalse(FileManager.default.fileExists(atPath: files.main))
    }

    // Rule: zingolib clears the save flag on every read, so a save right
    // after a load is a no-op until the wallet changes. A benchmark or a
    // test that loads then saves must dirty the wallet first.
    func testASaveRightAfterALoadIsANoOpUntilTheWalletChanges() throws {
        let files = try paths()
        let wallet = try savedWallet(birthday: 2_000_000)
        try wallet.write(to: URL(fileURLWithPath: files.main))
        _ = try rpc.fnLoadExistingWallet(serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: "1")
        func modified() throws -> Date? {
            try FileManager.default.attributesOfItem(atPath: files.main)[.modificationDate] as? Date
        }
        let before = try modified()
        Thread.sleep(forTimeInterval: 0.05)

        try rpc.saveWalletInternal()
        XCTAssertEqual(try modified(), before)

        _ = try createNewUnifiedAddress(receivers: "o")
        try rpc.saveWalletInternal()
        XCTAssertNotEqual(try modified(), before)
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

/// The per-file diagnosis behind the recovery dialog: base64 text that
/// decodes to a plausible wallet header reads `plainWallet`, truncation
/// included.
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

    func testATruncatedWalletFileDiagnosesPlainWallet() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        var wallet = Data([42, 0, 0, 0, 0, 0, 0, 0])
        wallet.append(Data(repeating: 7, count: 64))
        let text = wallet.base64EncodedString()
        let truncated = String(text.prefix(text.count / 2 + 1))
        try truncated.write(toFile: path, atomically: true, encoding: .utf8)

        let entry = try XCTUnwrap(mainEntry(rpc))
        XCTAssertEqual(entry["state"] as? String, "plainWallet")
        XCTAssertGreaterThan(entry["size"] as? Int ?? 0, 0)
    }

    func testGarbageTextDiagnosesUnknown() throws {
        let rpc = RPCModule()
        let path = try mainPath(rpc)
        try "!!!not-base64!!!".write(toFile: path, atomically: true, encoding: .utf8)

        let entry = try XCTUnwrap(mainEntry(rpc))
        XCTAssertEqual(entry["state"] as? String, "unknown")
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
/// and the delete purge of sidecar copies. The fixtures are real offline
/// wallets, since every move into a slot runs the full parse first.
class WalletSwapRecoveryTests: XCTestCase {
    private var walletA = Data()
    private var walletB = Data()
    private var walletC = Data()
    private var junk = Data()

    override func setUp() {
        super.setUp()
        setCryptoProvider()
        let rpc = RPCModule()
        walletA = (try? Self.savedWallet(rpc, birthday: 2_000_000)) ?? Data()
        walletB = (try? Self.savedWallet(rpc, birthday: 2_100_000)) ?? Data()
        walletC = (try? Self.savedWallet(rpc, birthday: 2_200_000)) ?? Data()
        junk = Data([42, 0, 0, 0, 0, 0, 0, 0]) + Data(repeating: 9, count: 64)
        RPCModule.walletFileClosed = false
    }

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
        if let files = try? paths(rpc) { clearOrphans(files) }
        RPCModule.walletFileClosed = false
        super.tearDown()
    }

    private static func savedWallet(_ rpc: RPCModule, birthday: UInt32) throws -> Data {
        _ = try initFromSeed(seed: Seeds.HOSPITAL, birthday: birthday, serveruri: "", chainhint: "main", performancelevel: "Medium", minconfirmations: 1)
        try FileManager.default.createDirectory(atPath: rpc.getDocumentsDirectory(), withIntermediateDirectories: true)
        let path = try rpc.getFileName("swap-fixture.dat")
        try? FileManager.default.removeItem(atPath: path)
        XCTAssertTrue(try saveWalletFile(tempPath: path))
        defer { try? FileManager.default.removeItem(atPath: path) }
        return try Data(contentsOf: URL(fileURLWithPath: path))
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

    private func write(_ bytes: Data, to path: String) throws {
        try bytes.write(to: URL(fileURLWithPath: path))
    }

    private func read(_ path: String) throws -> Data {
        try Data(contentsOf: URL(fileURLWithPath: path))
    }

    private func orphans(_ files: (main: String, backup: String, temp: String)) throws -> [Data] {
        let dir = (files.temp as NSString).deletingLastPathComponent
        let prefix = (files.temp as NSString).lastPathComponent + ".orphan."
        return try FileManager.default.contentsOfDirectory(atPath: dir)
            .filter { $0.hasPrefix(prefix) }
            .map { try Data(contentsOf: URL(fileURLWithPath: "\(dir)/\($0)")) }
    }

    private func clearOrphans(_ files: (main: String, backup: String, temp: String)) {
        let dir = (files.temp as NSString).deletingLastPathComponent
        let prefix = (files.temp as NSString).lastPathComponent + ".orphan."
        for name in (try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? [] where name.hasPrefix(prefix) {
            try? FileManager.default.removeItem(atPath: "\(dir)/\(name)")
        }
    }

    func testAClosedWalletFileRefusesTheSave() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.main)

        RPCModule.walletFileClosed = true
        try rpc.saveWalletInternal()

        XCTAssertEqual(try read(files.main), walletA)
    }

    func testDeleteClosesTheWalletFile() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.main)

        try rpc.fnDeleteExistingWallet()

        XCTAssertTrue(RPCModule.walletFileClosed)
    }

    func testInterruptedBeforeMainRenameFinishesTheSwap() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.temp)
        try write(walletB, to: files.backup)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
    }

    func testInterruptedBeforeBackupRenameFinishesTheSwap() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.temp)
        try write(walletB, to: files.main)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
    }

    func testASaveRecreatingMainFinishesTheSwap() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.temp)
        try write(walletA, to: files.main)
        try write(walletB, to: files.backup)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
    }

    func testAnInterruptionBeforeBackupIsRewrittenCompletesTheSwap() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.temp)
        try write(walletB, to: files.main)
        try write(walletB, to: files.backup)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
    }

    func testACompletedSwapDropsTheTemp() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.temp)
        try write(walletB, to: files.main)
        try write(walletA, to: files.backup)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertEqual(try read(files.backup), walletA)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
    }

    func testThreeDistinctWalletFilesBecomeAnOrphanAndTwoUntouchedSlots() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        clearOrphans(files)
        try write(walletA, to: files.temp)
        try write(walletC, to: files.main)
        try write(walletB, to: files.backup)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletC)
        XCTAssertEqual(try read(files.backup), walletB)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.temp))
        XCTAssertEqual(try orphans(files), [walletA])
    }

    func testAnUnreadableSwapTempIsNeverInstalledAndStaysAsEvidence() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(junk, to: files.temp)
        try write(walletB, to: files.main)

        rpc.completePendingSwap()

        XCTAssertEqual(try read(files.main), walletB)
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.backup))
        XCTAssertEqual(try read(files.temp), junk)
    }

    func testDeleteKeepsAnUnresolvedSwapTempAsAnOrphan() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        clearOrphans(files)
        try write(walletA, to: files.temp)
        try write(walletC, to: files.main)
        try write(walletB, to: files.backup)

        try rpc.fnDeleteExistingWallet()

        XCTAssertFalse(FileManager.default.fileExists(atPath: files.main))
        XCTAssertEqual(try orphans(files), [walletA])
        XCTAssertEqual(try read(files.backup), walletB)
    }

    func testDeleteDoesNotInstallAnUnreadableSwapTempAsTheBackup() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        try write(walletA, to: files.main)
        try write(junk, to: files.temp)

        try rpc.fnDeleteExistingWallet()

        XCTAssertFalse(FileManager.default.fileExists(atPath: files.main))
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.backup))
        XCTAssertEqual(try read(files.temp), junk)
    }

    func testDeleteRemovesTheBrokenCopyAndTheSwapTemp() throws {
        let rpc = RPCModule()
        let files = try paths(rpc)
        clear(files)
        let brokenPath = try rpc.getFileName("\(Constants.WalletFileName.rawValue).broken")
        try? FileManager.default.removeItem(atPath: brokenPath)
        try write(walletA, to: files.main)
        try write(walletA, to: brokenPath)
        try write(walletA, to: files.temp)

        try rpc.fnDeleteExistingWallet()

        let fm = FileManager.default
        XCTAssertFalse(fm.fileExists(atPath: files.main))
        XCTAssertFalse(fm.fileExists(atPath: brokenPath))
        XCTAssertFalse(fm.fileExists(atPath: files.temp))
        XCTAssertFalse(fm.fileExists(atPath: files.backup))
    }
}
