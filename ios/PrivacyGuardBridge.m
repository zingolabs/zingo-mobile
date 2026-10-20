//
//  PrivacyGuardBridge.m
//  Zingo
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(PrivacyGuard, RCTEventEmitter)

RCT_EXTERN_METHOD(isCaptured:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(copySensitive:
    (NSString *)text
                  seconds:(double)seconds
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
