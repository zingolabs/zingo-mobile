//
//  NymTransportModuleBridge.m
//  Zingo
//
//  Exposes NymTransportModule (Swift) to React Native, mirroring RPCModule.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NymTransportModule, NSObject)

RCT_EXTERN_METHOD(startMixnetTransport:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopMixnetTransport:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
