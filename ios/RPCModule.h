//
//  RPCModule.h
//  ZingoMobile
//
//  Created by Aditya Kulkarni on 5/18/20.
//

#ifndef RPCModule_h
#define RPCModule_h


#import <React/RCTBridgeModule.h>

@interface RPCModule: NSObject <RCTBridgeModule>

-(void) saveWalletInternal;
-(NSString *) readSettings;

@end


#endif /* RPCModule_h */
