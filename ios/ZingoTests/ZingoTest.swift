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
