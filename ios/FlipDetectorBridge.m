#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(FlipDetector, RCTEventEmitter)

RCT_EXTERN_METHOD(isAvailable:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(start)
RCT_EXTERN_METHOD(stop)

@end
