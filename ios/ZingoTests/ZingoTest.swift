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
    static let ABANDON = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
    static let HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

enum UfvkConst {
    static let ABANDON = "uview1wj07tp4y3rwzjplg68c3lum2avq4v3j0w0mf0urdlxzthnfr26q8ssz9hvylspj638tuh2r233gaxm2qh27gj6m9q25prk7gt8xwqzmwxm580tg0f5llvr7d6h4y6jc2t7zl7lz9ge60ta6226jyysgk8xpu2wqxesrw4q2mydrhj5dea5l9scl0p3l4ayqgfej54wex5aa2ylq89nyqg94l4lh6dawuc2e3s8v7737zn7p5fl96hhpjqg4jucnp2r2jjqxev3z7lp3k9ulfpl2gw0lng8vfe8hj8afggqzdwxgfaq6dy82guvh34kv4q5ay7gq6n0ujg7exu0mgznpr4wf0agjdhnd4k6af5md3f3msqedw364vx3lyd3hwekvrulywa4c0ja4ze2fxtcm0vrz0278g9n37y0jg6dx847g3peyq9lwmm04ac3tt4sldnrcfc5ew3k0aqgycnryfvv44zxzng485ks27wky2ulfy9q8hu97l"
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
    let scan_ranges: [ScanRanges]
    let sync_start_height: UInt64
    let session_blocks_scanned: UInt64
    let total_blocks_scanned: UInt64
    let percentage_session_blocks_scanned: Double
    let percentage_total_blocks_scanned: Double
    let session_sapling_outputs_scanned: UInt64
    let total_sapling_outputs_scanned: UInt64
    let session_orchard_outputs_scanned: UInt64
    let total_orchard_outputs_scanned: UInt64
    let percentage_session_outputs_scanned: Double
    let percentage_total_outputs_scanned: Double
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
    let pool_received: String?
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
            if let status: SyncStatus = try? decodeJSON(statusJson),
            status.percentage_total_outputs_scanned >= 100.0 {
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
    func executeAddressesFromSeed() throws {
        setCryptoProvider()

        let serveruri = "http://10.0.2.2:20000"
        let chainhint = "regtest"
        let seed = Seeds.ABANDON

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
    func executeAddressFromUfvk() throws {
        setCryptoProvider()

        let serveruri = "http://10.0.2.2:20000"
        let chainhint = "regtest"
        let ufvk = UfvkConst.ABANDON

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
    func executeVersionFromSeed() throws {
        setCryptoProvider()
        let serveruri = "http://10.0.2.2:20000"
        let chainhint = "regtest"
        let seed = Seeds.ABANDON

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
    func executeSyncFromSeed() throws {
        setCryptoProvider()
        let serveruri = "http://10.0.2.2:20000"
        let chainhint = "regtest"
        let seed = Seeds.ABANDON

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
    func executeSendFromOrchard() throws {
        setCryptoProvider()
        let mapper = JSONEncoder() // para el body del send

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
            var balJson = try getBalance()
            print("\nBalance pre-send:\n\(balJson)")
            var bal: Balance = try decodeJSON(balJson)
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
        
        do {
          let confirmJson = try confirm()
          print("\nConfirm Txid:\n\(confirmJson)")
        } catch {
          XCTFail("\nConfirm error:\n\(error.localizedDescription)")
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
            var balJson = try getBalance()
            print("\nBalance post-send:\n\(balJson)")
            var bal: Balance = try decodeJSON(balJson)
            XCTAssertEqual(bal.total_orchard_balance, 885_000)
            XCTAssertEqual(bal.confirmed_transparent_balance, 0)
            XCTAssertEqual(bal.unconfirmed_transparent_balance, 100_000)
        } catch {
          XCTFail("\nBalance post-send error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class UpdateCurrentPriceAndValueTransfersFromSeed: XCTestCase {
    func updateCurrentPriceAndValueTransfersFromSeed() throws {
        setCryptoProvider()

        let serveruri = "http://10.0.2.2:20000"
        let chainhint = "regtest"
        let seed = Seeds.HOSPITAL
        let tor = "false"

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
          let price = try zecPrice(tor: tor)
          print("\nPrice:\n\(price)")
        } catch {
          XCTFail("\nInit from seed error:\n\(error.localizedDescription)")
          return
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
            XCTAssertEqual(vts.value_transfers[0].value, 0)
            XCTAssertEqual(vts.value_transfers[0].transaction_fee, 20_000)

            XCTAssertEqual(vts.value_transfers[1].kind, "sent")
            XCTAssertEqual(vts.value_transfers[1].recipient_address, recipientAddress)
            XCTAssertEqual(vts.value_transfers[1].status, "confirmed")
            XCTAssertEqual(vts.value_transfers[1].value, 100_000)
            XCTAssertEqual(vts.value_transfers[1].transaction_fee, 10_000)

            XCTAssertEqual(vts.value_transfers[2].kind, "received")
            XCTAssertEqual(vts.value_transfers[2].pool_received, "Orchard")
            XCTAssertEqual(vts.value_transfers[2].status, "confirmed")
            XCTAssertEqual(vts.value_transfers[2].value, 1_000_000)
        } catch {
          XCTFail("\nValue Transfers error:\n\(error.localizedDescription)")
          return
        }
    }
}

final class ExecuteSaplingBalanceFromSeed: XCTestCase {
    func executeSaplingBalanceFromSeed() throws {
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
    func executeParseAddressForTex() throws {
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
    func executeParseAddressInvalid() throws {
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
