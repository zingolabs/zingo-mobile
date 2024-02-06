#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>

#import <BackgroundTasks/BackgroundTasks.h>
#import "RPCModule.h"
#import "rust.h"
#import "reachability.h"

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>

static void InitializeFlipper(UIApplication *application) {
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
}
#endif

@implementation AppDelegate
static BOOL _syncFinished = true;

+ (BOOL)syncFinished {
  return _syncFinished;
}

+ (void)setSyncFinished:(BOOL)newSyncFinished {
  _syncFinished = newSyncFinished;
}

static NSString* syncTask = @"Zingo_Processing_Task_ID";
static NSString* syncSchedulerTask = @"Zingo_Processing_Scheduler_Task_ID";
static BOOL isConnectedToWifi = false;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:@"Zingo!"
                                            initialProperties:nil];

  rootView.backgroundColor = [[UIColor alloc] initWithRed:0.0f green:0.0f blue:0.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  NSLog(@"handle background task");
  [self handleBackgroundTask];

  return YES;
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
      //NSLog(@"configureProcessingTask");
      //[self configureProcessingTask];
  }
  return YES;
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
  // cancel existing task (if any)
  //NSLog(@"scheduleProcessingTask CANCEL - foreground");
  //[self setSyncFinished:true];
  //char *resp2 = execute("interrupt_sync_after_batch", "true");
  //NSString* respStr2 = [NSString stringWithUTF8String:resp2];
  //NSLog(@"interrupt syncing %@", respStr2);
  //[BGTaskScheduler.sharedScheduler cancelTaskRequestWithIdentifier:syncTask];
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  if (@available(iOS 13.0, *)) {
      //NSLog(@"scheduleBackgroundTask");
      //[self scheduleBackgroundTask];
      //NSLog(@"scheduleShedulerBackgroundTask");
      //[self scheduleSchedulerBackgroundTask];
      //[self handleBackgroundTask];
  }
}

-(void)configureProcessingTask_old {
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
      char *resp3 = execute("interrupt_sync_after_batch", "true");
      NSString* respStr3 = [NSString stringWithUTF8String:resp3];
      NSLog(@"interrupt syncing %@", respStr3);
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

-(void)scheduleProcessingTask_old {
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
            NSLog(@"Failed to submit request: %@", error);
        } else {
            NSLog(@"Success submit request %@", request);
        }
    } else {
        // No fallback
    }
}

// NEW BACKGROUND SCHEDULING TASK

- (void)handleBackgroundTask {
    // We require the background task to run when connected to the power and wifi
    Reachability *reachability = [Reachability reachabilityForInternetConnection];
    NetworkStatus networkStatus = [reachability currentReachabilityStatus];
    
    if (networkStatus == ReachableViaWiFi) {
      isConnectedToWifi = true;
    } else {
      isConnectedToWifi = false;
    }
    NSLog(@"BGTask isConnectedToWifi %@", isConnectedToWifi ? @"true" : @"false");
    
    [self registerTasks];
}

- (void)registerTasks {
    BOOL bcgSyncTaskResult;
    bcgSyncTaskResult = [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncTask usingQueue:dispatch_get_main_queue() launchHandler:^(BGTask * _Nonnull task) {
        if (![task isKindOfClass:[BGProcessingTask class]]) {
            return;
        }
        NSLog(@"BGTask BGTaskScheduler.shared.register SYNC called");
        [self startBackgroundTask:(BGProcessingTask *)task];
    }];
    
    NSLog(@"BGTask SYNC registered %d", bcgSyncTaskResult);

    BOOL bcgSchedulerTaskResult;
    bcgSchedulerTaskResult = [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncSchedulerTask usingQueue:dispatch_get_main_queue() launchHandler:^(BGTask * _Nonnull task) {
        if (![task isKindOfClass:[BGProcessingTask class]]) {
            return;
        }
        NSLog(@"BGTask BGTaskScheduler.shared.register SCHEDULER called");
        [self scheduleSchedulerBackgroundTask];
        [self scheduleBackgroundTask];
        [task setTaskCompletedWithSuccess:YES];
    }];
    
    NSLog(@"BGTask SCHEDULER registered %d", bcgSchedulerTaskResult);
}


- (void)startBackgroundTask:(BGProcessingTask *)task {
    NSLog(@"BGTask startBackgroundTask called");
    
    // Schedule tasks for the next time
    [self scheduleBackgroundTask];
    [self scheduleSchedulerBackgroundTask];
    
    if (!isConnectedToWifi) {
        NSLog(@"BGTask startBackgroundTask: not connected to the wifi");
        [task setTaskCompletedWithSuccess:NO];
        return;
    }
    
    // Start the syncing
    NSLog(@"configureProcessingTask run");
    [NSThread detachNewThreadSelector:@selector(syncingProcessBackgroundTask:) toTarget:self withObject:nil];
    [self syncingStatusProcessBackgroundTask:nil];
    
    task.expirationHandler = ^{
        NSLog(@"BGTask startBackgroundTask expirationHandler called");
        // Stop the syncing because the allocated time is about to expire
        NSLog(@"scheduleProcessingTask CANCEL - is about to expire");
        [self setSyncFinished:true];
        char *resp2 = execute("interrupt_sync_after_batch", "true");
        NSString* respStr2 = [NSString stringWithUTF8String:resp2];
        NSLog(@"interrupt syncing %@", respStr2);
    };
}

- (void)scheduleBackgroundTask {
    // This method can be called as many times as needed, the previously submitted
    // request will be overridden by the new one.
    NSLog(@"BGTask scheduleBackgroundTask called");

    BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:syncTask];
    
    NSDate *today = [[NSCalendar currentCalendar] startOfDayForDate:[NSDate date]];
    NSDate *tomorrow = [[NSCalendar currentCalendar] dateByAddingUnit:NSCalendarUnitDay value:1 toDate:today options:0];
    
    NSDateComponents *earlyMorningComponent = [[NSDateComponents alloc] init];
    earlyMorningComponent.hour = 3;
    earlyMorningComponent.minute = arc4random_uniform(61);
    NSDate *earlyMorning = [[NSCalendar currentCalendar] dateByAddingComponents:earlyMorningComponent toDate:tomorrow options:0];
    
    request.earliestBeginDate = earlyMorning;
    request.requiresExternalPower = YES;
    request.requiresNetworkConnectivity = YES;
    
    NSError *error = nil;
    [[BGTaskScheduler sharedScheduler] submitTaskRequest:request error:&error];
    if (error) {
        NSLog(@"BGTask scheduleBackgroundTask failed to submit, error: %@", error);
    } else {
        NSLog(@"BGTask scheduleBackgroundTask succeeded to submit");
    }
}

- (void)scheduleSchedulerBackgroundTask {
    // This method can be called as many times as needed, the previously submitted
    // request will be overridden by the new one.
    NSLog(@"BGTask scheduleSchedulerBackgroundTask called");
    
    BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:syncSchedulerTask];
    
    NSDate *today = [[NSCalendar currentCalendar] startOfDayForDate:[NSDate date]];
    NSDate *tomorrow = [[NSCalendar currentCalendar] dateByAddingUnit:NSCalendarUnitDay value:1 toDate:today options:0];
    
    NSDateComponents *afternoonComponent = [[NSDateComponents alloc] init];
    afternoonComponent.hour = 14;
    afternoonComponent.minute = arc4random_uniform(61);
    NSDate *afternoon = [[NSCalendar currentCalendar] dateByAddingComponents:afternoonComponent toDate:tomorrow options:0];
    
    request.earliestBeginDate = afternoon;
    request.requiresExternalPower = NO;
    request.requiresNetworkConnectivity = NO;
    
    NSError *error = nil;
    [[BGTaskScheduler sharedScheduler] submitTaskRequest:request error:&error];
    if (error) {
        NSLog(@"BGTask scheduleSchedulerBackgroundTask failed to submit, error: %@", error);
    } else {
        NSLog(@"BGTask scheduleSchedulerBackgroundTask succeeded to submit");
    }
}

@end
