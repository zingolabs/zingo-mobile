//
//  RPCModule.h
//  Zingo!
//
//  Created by Aditya Kulkarni on 5/18/20.
//

#ifndef RPCModule_h
#define RPCModule_h


#import <React/RCTBridgeModule.h>

@interface RPCModule: NSObject <RCTBridgeModule>

-(void) saveWalletInternal;
-(void) saveBackgroundFile:(NSString*)data;
-(NSString*) createNewWallet:(NSString*)server chainhint:(NSString*)chainhint;
-(NSString*) loadExistingWallet:(NSString*)server chainhint:(NSString*)chainhint;
-(BOOL) deleteExistingWallet;

@end


#endif /* RPCModule_h */
