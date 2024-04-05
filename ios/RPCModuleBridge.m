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
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(walletBackupExists: 
    (RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteExistingWallet: 
    (RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteExistingWalletBackup: 
    (RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(createNewWallet: 
    (NSString)server 
    chainhinter:(NSString)chainhint 
    resolver:(RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(restoreWalletFromSeed: 
    (RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(walletBackupExists: 
    (NSString)restoreSeed 
    birthdayer:(NSString)birthday 
    serverer:(NSString)server 
    chainhinter:(NSString)chainhint 
    resolver:(RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(restoreWalletFromUfvk: 
    (NSString)restoreUfvk 
    birthdayer:(NSString)birthday 
    serverer:(NSString)server 
    chainhinter:(NSString)chainhint 
    resolver:(RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(loadExistingWallet: 
    (NSString)server 
    chainhinter:(NSString)chainhint 
    resolver:(RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(restoreExistingWalletBackup: 
    (RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(doSave: 
    (RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(doSaveBackup: 
    (RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(execute: 
    (NSString)method 
    argser:(NSString)args 
    resolver:(RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getLatestBlock: 
    (NSString)server 
    resolver:(RCTPromiseResolveBlock)resolve 
    rejecter:(RCTPromiseRejectBlock)reject)

@end
