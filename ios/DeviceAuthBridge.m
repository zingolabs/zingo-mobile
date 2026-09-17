//
//  DeviceAuthBridge.m
//  Zingo
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DeviceAuth, NSObject)

RCT_EXTERN_METHOD(canAuthenticate:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(authenticate:
    (NSString *)title
                  cancel:(NSString *)cancel
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
