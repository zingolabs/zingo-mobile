#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

@implementation AppDelegate
static BOOL _syncFinished = true;

+ (BOOL)syncFinished {
  return _syncFinished;
}

+ (void)setSyncFinished:(BOOL)newSyncFinished {
  _syncFinished = newSyncFinished;
}

static NSString* syncTask = @"Zingo_Processing_Task_ID";

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"Zingo!";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
 return [RCTLinkingManager application:application
                  continueUserActivity:userActivity
                  restorationHandler:restorationHandler];
}

- (BOOL)application:(UIApplication *)application willFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  if (@available(iOS 13.0, *)) {
      NSLog(@"configureProcessingTask");
      [self configureProcessingTask];
  }
  return YES;
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
  // cancel existing task (if any)
  NSLog(@"scheduleProcessingTask CANCEL - foreground");
  [self setSyncFinished:true];
  [BGTaskScheduler.sharedScheduler cancelTaskRequestWithIdentifier:syncTask];
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  if (@available(iOS 13.0, *)) {
      NSLog(@"scheduleProcessingTask");
      [self scheduleProcessingTask];
  }
}

-(void)configureProcessingTask {
    if (@available(iOS 13.0, *)) {
        [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncTask
                                                              usingQueue:nil
                                                           launchHandler:^(BGTask *task) {
            NSLog(@"configureProcessingTask run");
            [NSThread detachNewThreadSelector:@selector(syncingProcessBackgroundTask:) toTarget:self withObject:nil];
            [self syncingStatusProcessBackgroundTask:nil];

        }];
    } else {
        // No fallback
    }
}

-(void)syncingProcessBackgroundTask:(NSString *)noValue {
  //do things with task
  @autoreleasepool {

    BOOL exists = [self wallet__exists];

    if (exists) {

      NSLog(@"handleProcessingTask sync begin");
      [self setSyncFinished:false];

      char *resp2 = execute("sync", "");
      NSString* respStr2 = [NSString stringWithUTF8String:resp2];
      rust_free(resp2);

      NSLog(@"handleProcessingTask sync end %@", respStr2);
      
      [self setSyncFinished:true];

      // the execute `sync` already save the wallet when finished

    } else {

      [self setSyncFinished:true];
      NSLog(@"handleProcessingTask No exists wallet");

    }

  }

}

-(void)syncingStatusProcessBackgroundTask:(NSString *)noValue {
  @autoreleasepool {

    NSLog(@"handleProcessingTask sync status begin %i", self.syncFinished);
    NSInteger prevBatch = -1;

    while(!self.syncFinished) {
      [NSThread sleepForTimeInterval: 2.0];
      char *resp = execute("syncstatus", "");
      NSString* respStr = [NSString stringWithUTF8String:resp];
      rust_free(resp);
      NSLog(@"handleProcessingTask sync status response %i %@", self.syncFinished, respStr);

      NSData *data = [respStr dataUsingEncoding:NSUTF8StringEncoding];
      id jsonResp = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
      NSString *batchStr = [jsonResp valueForKey:@"batch_num"];
      NSInteger batch = [batchStr integerValue];
      BOOL progress = [jsonResp valueForKey:@"in_progress"];

      NSLog(@"handleProcessingTask batch number %i %@", self.syncFinished, batchStr);

      if (prevBatch != -1 && batch > 0 && prevBatch != batch) {
        // save the wallet
        RPCModule *rpcmodule = [RPCModule new];
        [rpcmodule saveWalletInternal];

        // save info in background json
        NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
        // NSTimeInterval is defined as double
        NSNumber *timeStampObj = [NSNumber numberWithDouble: timeStamp];
        NSString *timeStampStr = [timeStampObj stringValue];
        NSString *jsonBackgroud = [NSString stringWithFormat: @"%@%@%@%@%@", @"{\"batches\": \"", batchStr, @"\", \"date\": \"", timeStampStr, @"\"}"];
        [rpcmodule saveBackgroundFile:jsonBackgroud];

        NSLog(@"handleProcessingTask save wallet & background batch %i %@ %i %@", self.syncFinished, batchStr, progress, timeStampStr);
      }
      prevBatch = batch;
    }

    // we don't want to save if the sync is finished:
    // 1. OS kill the task -> to save is dangerous.
    // 2. When the App go to foreground -> same.
    // 3. If sync is finished -> the wallet is already saved.

  }
}

-(BOOL)wallet__exists {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
      (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  // Write to user's documents app directory
  NSString *fileName = [NSString stringWithFormat:@"%@/wallet.dat.txt",
                                                documentsDirectory];
  BOOL fileExists = [[NSFileManager defaultManager] fileExistsAtPath:fileName];
  // RCTLogInfo(@"Wallet exists: %d", (int)fileExists);

  if (fileExists) {
    return true;
  } else {
    return false;
  }
}

-(void)scheduleProcessingTask {
    if (@available(iOS 13.0, *)) {
        NSLog(@"schedulingProcessingTask");
        NSError *error = NULL;
        // cancel existing task (if any)
        [BGTaskScheduler.sharedScheduler cancelTaskRequestWithIdentifier:syncTask];
        // new task
        BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:syncTask];
        request.requiresNetworkConnectivity = YES;
        request.earliestBeginDate = nil;
        BOOL success = [[BGTaskScheduler sharedScheduler] submitTaskRequest:request error:&error];
        if (!success) {
            // Errorcodes https://stackoverflow.com/a/58224050/872051
            NSLog(@"Failed to submit request: %@", error);
        } else {
            NSLog(@"Success submit request %@", request);
        }
    } else {
        // No fallback
    }
}
@end
