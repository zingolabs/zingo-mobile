//
//  RPCModuleBridge.m
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RPCModule, NSObject)

RCT_EXTERN_METHOD(walletExists: 
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(walletBackupExists:
    (RCTPromiseResolveBlock)resolve 
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteExistingWallet:
    (RCTPromiseResolveBlock)resolve 
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteExistingWalletBackup:
    (RCTPromiseResolveBlock)resolve 
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(createNewWallet:
    (NSString)server 
                  chainhint:(NSString)chainhint
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(restoreWalletFromSeed:
    (NSString)restoreSeed 
                  birthday:(NSString)birthday
                  server:(NSString)server
                  chainhint:(NSString)chainhint
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(restoreWalletFromUfvk:
    (NSString)restoreUfvk 
                  birthday:(NSString)birthday
                  server:(NSString)server
                  chainhint:(NSString)chainhint
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loadExistingWallet:
    (NSString)server 
                  chainhint:(NSString)chainhint
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(restoreExistingWalletBackup:
    (RCTPromiseResolveBlock)resolve 
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(doSave:
    (RCTPromiseResolveBlock)resolve 
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(doSaveBackup:
    (RCTPromiseResolveBlock)resolve 
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(execute:
    (NSString)method 
                  args:(NSString)args
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getLatestBlock:
    (NSString)server 
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getDonationAddress:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getZenniesDonationAddress:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getValueTransfersList:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getTransactionSummariesList:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
