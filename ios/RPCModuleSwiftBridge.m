//
//  RPCModuleBridge.m
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RPCModuleSwift, NSObject)

RCT_EXTERN_METHOD(walletExists: (RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

@end
