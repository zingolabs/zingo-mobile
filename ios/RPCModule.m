//
//  RPCModule.m
//  ZecwalletMobile
//
//  Created by Aditya Kulkarni on 5/18/20.
//

#import <Foundation/Foundation.h>
#import "RPCModule.h"
#import <React/RCTLog.h>
#import "rust.h"

@implementation RPCModule

NSString* const URL = @"https://lightwalletd.zecwallet.co:1443";

// To make it accessible in React
RCT_EXPORT_MODULE();

// Test if wallet exists
RCT_REMAP_METHOD(walletExists,
                 walletExistsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"walletExists called");
  
  NSArray *paths = NSSearchPathForDirectoriesInDomains
      (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  // Write to user's documents app directory
  NSString *fileName = [NSString stringWithFormat:@"%@/zecwallet-lite.dat.txt",
                                                documentsDirectory];
  BOOL fileExists = [[NSFileManager defaultManager] fileExistsAtPath:fileName];
  RCTLogInfo(@"Wallet exists: %d", (int)fileExists);
  
  if (fileExists) {
    resolve(@"true");
  } else {
    resolve(@"false");
  }
}

// Save the base64 encoded wallet data
-(void) saveWalletFile:(NSString *)data {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
      (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  // Write to user's documents app directory
  NSString *fileName = [NSString stringWithFormat:@"%@/zecwallet-lite.dat.txt",
                                                documentsDirectory];
  [data writeToFile:fileName atomically:YES encoding:NSUTF8StringEncoding error:nil];
  
  RCTLogInfo(@"Saved file");
}

// Read base64 encoded wallet data to a NSString, which is auto translated into a React String when returned
-(NSString *) readWallet {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
                  (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  //make a file name to write the data to using the documents directory:
  NSString *fileName = [NSString stringWithFormat:@"%@/zecwallet-lite.dat.txt",
                                                documentsDirectory];
  NSString *content = [[NSString alloc] initWithContentsOfFile:fileName
                                                usedEncoding:nil
                                                       error:nil];
  
  RCTLogInfo(@"Read file");
  return content;
}


// Delete an existing wallet file
RCT_REMAP_METHOD(deleteExistingWallet,
                 deleteExistingWalletWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"deleteExistingWallet called");
  NSArray *paths = NSSearchPathForDirectoriesInDomains
                  (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  //make a file name to write the data to using the documents directory:
  NSString *fileName = [NSString stringWithFormat:@"%@/zecwallet-lite.dat.txt",
                                                documentsDirectory];
  // Delete the file
  [[NSFileManager defaultManager] removeItemAtPath:fileName error:nil];
}


// (Non react) Save the current wallet to disk
-(void) saveWalletInternal {
  // Then save the file
  char *walletDat = save();
  NSString* walletDataStr = [NSString stringWithUTF8String:walletDat];
  rust_free(walletDat);
  
  [self saveWalletFile:walletDataStr];
}

// Create a new wallet, automatically saving it.
RCT_REMAP_METHOD(createNewWallet,
                 createNewWalletWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  @autoreleasepool {
    RCTLogInfo(@"createNewWallet called");
    
    NSString* pathSaplingOutput = [[NSBundle mainBundle]
                      pathForResource:@"saplingoutput" ofType:@""];
    NSData* saplingOutput = [NSData dataWithContentsOfFile:pathSaplingOutput];
    

    NSString* pathSaplingSpend = [[NSBundle mainBundle]
                      pathForResource:@"saplingspend" ofType:@""];
    NSData* saplingSpend = [NSData dataWithContentsOfFile:pathSaplingSpend];
    
    char* seed = init_new([URL UTF8String], [[saplingOutput base64EncodedStringWithOptions:0] UTF8String], [[saplingSpend base64EncodedStringWithOptions:0] UTF8String]);
    NSString* seedStr = [NSString stringWithUTF8String:seed];
    rust_free(seed);
    
    RCTLogInfo(@"Got seed: %@", seedStr);
    
    // Also save the wallet after create
    [self saveWalletInternal];
    
    resolve(seedStr);
  }
}

// restore a wallet from a given seed and birthday. This also saves the wallet
RCT_REMAP_METHOD(restoreWallet,
                 restoreSeed:(NSString*)restoreSeed
                 birthday:(NSString*)birthday
                 restoreWalletWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  @autoreleasepool {
    RCTLogInfo(@"restoreWallet called with %@ %@", restoreSeed, birthday);
    
    NSString* pathSaplingOutput = [[NSBundle mainBundle]
                      pathForResource:@"saplingoutput" ofType:@""];
    NSData* saplingOutput = [NSData dataWithContentsOfFile:pathSaplingOutput];
    

    NSString* pathSaplingSpend = [[NSBundle mainBundle]
                      pathForResource:@"saplingspend" ofType:@""];
    NSData* saplingSpend = [NSData dataWithContentsOfFile:pathSaplingSpend];
    
    char* seed = initfromseed([URL UTF8String], [restoreSeed UTF8String], [birthday UTF8String], [[saplingOutput base64EncodedStringWithOptions:0] UTF8String], [[saplingSpend base64EncodedStringWithOptions:0] UTF8String]);
    NSString* seedStr = [NSString stringWithUTF8String:seed];
    rust_free(seed);
    
    RCTLogInfo(@"Seed: %@", seedStr);
    
    if (![seedStr hasPrefix:@"Error"]) {
      // Also save the wallet after restore
      [self saveWalletInternal];
    }
    
    resolve(seedStr);
  }
}

// Load an existing wallet from the user's app documents
RCT_REMAP_METHOD(loadExistingWallet,
                 loadExistingWalletWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  @autoreleasepool {
    RCTLogInfo(@"loadExistingWallet called");
    NSString* walletDataStr = [self readWallet];
    
    NSString* pathSaplingOutput = [[NSBundle mainBundle]
                      pathForResource:@"saplingoutput" ofType:@""];
    NSData* saplingOutput = [NSData dataWithContentsOfFile:pathSaplingOutput];
    
    NSString* pathSaplingSpend = [[NSBundle mainBundle]
                      pathForResource:@"saplingspend" ofType:@""];
    NSData* saplingSpend = [NSData dataWithContentsOfFile:pathSaplingSpend];
    
    char* seed = initfromb64([URL UTF8String], [walletDataStr UTF8String], [[saplingOutput base64EncodedStringWithOptions:0] UTF8String], [[saplingSpend base64EncodedStringWithOptions:0] UTF8String]);
    NSString* seedStr = [NSString stringWithUTF8String:seed];
    rust_free(seed);
    
    RCTLogInfo(@"Seed: %@", seedStr);
    
    resolve(seedStr);
  }
}

RCT_REMAP_METHOD(doSave,
                 doSaveWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  [self saveWalletInternal];
  
  resolve(@"true");
}


// Send a Tx. React needs to construct the sendJSON and pass it in as a string
RCT_REMAP_METHOD(doSend,
                 sendJSON:(NSString *)sendJSON
                 doSendWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"doSend called with %@", sendJSON);
    
  char *resp = execute("send", [sendJSON UTF8String]);
  NSString* respStr = [NSString stringWithUTF8String:resp];
  rust_free(resp);
  
  RCTLogInfo(@"Got resp: %@", respStr);
  resolve(respStr);
}

-(void) doSyncOnThread:(RCTPromiseResolveBlock)resolve {
  @autoreleasepool {
    char *resp = execute("sync", "");
    NSString* respStr = [NSString stringWithUTF8String:resp];
    rust_free(resp);
    
    RCTLogInfo(@"Got sync response: %@", respStr);
    
    if (![respStr hasPrefix:@"Error"]) {
      // Also save the wallet after sync
      [self saveWalletInternal];
    }
    
    resolve(respStr);
  }
}

// doSync.
RCT_REMAP_METHOD(doSync,
                 doSyncWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"doSync called");
    
  [NSThread detachNewThreadSelector:@selector(doSyncOnThread:) toTarget:self withObject:resolve];
}

// Generic Execute the command.
RCT_REMAP_METHOD(execute,
                 method:(NSString *)method
                 args:(NSString *)args
                 executeWithResolver:(RCTPromiseResolveBlock)resolve
                 rejected:(RCTPromiseRejectBlock)reject) {
  RCTLogInfo(@"execute called with %@", method);
  
  char *resp = execute([method UTF8String], [args UTF8String]);
  NSString* respStr = [NSString stringWithUTF8String:resp];
  rust_free(resp);
  
  RCTLogInfo(@"Got resp for execute (%@): %@", method, respStr);
  resolve(respStr);
}

@end
