//
//  RPCModuleBridge.m
//  Zingo
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
RCT_EXTERN_METHOD(loadExistingWallet:
    (NSString *)serverUri
                  chain:(NSString *)chain
                  performanceLevel:(NSString *)performanceLevel
                  minConfirmations:(nonnull NSNumber *)minConfirmations
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(saveWallet:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(saveWalletBackup:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(restoreExistingWalletBackup:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteExistingWallet:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteExistingWalletBackup:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(walletFileRecoveryInfo:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
