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

static NSString* syncTask = @"Zingo_Processing_Task_ID";
static NSString* syncSchedulerTask = @"Zingo_Processing_Scheduler_Task_ID";
static BOOL isConnectedToWifi = false;
static BGProcessingTask *bgTask = nil;

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

  if (@available(iOS 13.0, *)) {
      NSLog(@"BGTask handleBackgroundTask");
      [self handleBackgroundTask];
  }

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

- (void)applicationWillEnterForeground:(UIApplication *)application
{
  if (@available(iOS 13.0, *)) {
      // cancel existing sync process (if any).
      NSLog(@"BGTask foreground");
      [self stopSyncingProcess:nil];

      // cancel bg task
      if ([bgTask isKindOfClass:[BGTask class]]) {
           NSLog(@"BGTask foreground - sync task CANCEL");
           [bgTask setTaskCompletedWithSuccess:NO];
       }
       bgTask = nil;
  }
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  if (@available(iOS 13.0, *)) {
      // cancel existing sync process (if any).
      NSLog(@"BGTask background");
      [self stopSyncingProcess:nil];
      
      // cancel bg task
      if ([bgTask isKindOfClass:[BGTask class]]) {
          NSLog(@"BGTask background - sync task CANCEL");
          [bgTask setTaskCompletedWithSuccess:NO];
      }
      bgTask = nil;

      NSLog(@"BGTask background - scheduleBackgroundTask");
      [self scheduleBackgroundTask];
      NSLog(@"BGTask background - scheduleSchedulerBackgroundTask");
      [self scheduleSchedulerBackgroundTask];
  }
}

-(void)stopSyncingProcess:(NSString *)noValue {
  // if the in_progress from syncstatus is true
  // there is a sync progress running somehow
  // we need to stop it and the only tool I have is
  // using the `interrupting` sync flag...
  // and waiting for the end.
  @autoreleasepool {

    NSLog(@"BGTask stopSyncingProcess");
    char *resp = execute("syncstatus", "");
    NSString* respStr = [NSString stringWithUTF8String:resp];
    rust_free(resp);
    NSLog(@"BGTask stopSyncingProcess - status response %@", respStr);

    NSData *data = [respStr dataUsingEncoding:NSUTF8StringEncoding];
    id jsonResp = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    NSString *inProgressStr = [jsonResp valueForKey:@"in_progress"];
    BOOL inProgress = [inProgressStr boolValue];

    while(inProgress) {
      char *resp2 = execute("interrupt_sync_after_batch", "true");
      NSString* respStr2 = [NSString stringWithUTF8String:resp2];
      NSLog(@"BGTask stopSyncingProcess - interrupt syncing %@", respStr2);

      [NSThread sleepForTimeInterval: 0.5];

      char *resp = execute("syncstatus", "");
      NSString* respStr = [NSString stringWithUTF8String:resp];
      rust_free(resp);
      NSLog(@"BGTask stopSyncingProcess - status response %@", respStr);

      NSData *data = [respStr dataUsingEncoding:NSUTF8StringEncoding];
      id jsonResp = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
      NSString *inProgressStr = [jsonResp valueForKey:@"in_progress"];
      inProgress = [inProgressStr boolValue];
    }

    NSLog(@"BGTask stopSyncingProcess - syncing process STOPPED");

  }

}

-(void)syncingProcessBackgroundTask:(NSString *)noValue {
  //do things with task
  @autoreleasepool {
    
    NSLog(@"BGTask syncingProcessBackgroundTask");
    BOOL exists = [self wallet__exists];

    if (exists) {
      // stop syncing first, just in case.
      [self stopSyncingProcess:nil];

      // we need to sync without interruption, I run this just in case
      char *resp = execute("interrupt_sync_after_batch", "false");
      NSString* respStr = [NSString stringWithUTF8String:resp];
      NSLog(@"BGTask syncingProcessBackgroundTask - no interrupt syncing %@", respStr);
      rust_free(resp);

      // the task is running here blocking this execution until this process finished:
      // 1. finished the syncing.
      // 2. interrupted by a flag then it finished the current batch.

      NSLog(@"BGTask syncingProcessBackgroundTask - sync BEGIN");

      char *resp2 = execute("sync", "");
      NSString* respStr2 = [NSString stringWithUTF8String:resp2];
      rust_free(resp2);

      NSLog(@"BGTask syncingProcessBackgroundTask - sync END %@", respStr2);

    } else {
      
      NSLog(@"BGTask syncingProcessBackgroundTask - No exists wallet file END");

    }

  }

  NSLog(@"BGTask syncingProcessBackgroundTask - syncing task STOPPED");
  [bgTask setTaskCompletedWithSuccess:YES];
  bgTask = nil;  

}

-(BOOL)wallet__exists {
  NSArray *paths = NSSearchPathForDirectoriesInDomains
      (NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];

  // Write to user's documents app directory
  NSString *fileName = [NSString stringWithFormat:@"%@/wallet.dat.txt",
                                                documentsDirectory];
  BOOL fileExists = [[NSFileManager defaultManager] fileExistsAtPath:fileName];

  if (fileExists) {
    return true;
  } else {
    return false;
  }
}

// NEW BACKGROUND SCHEDULING TASKS

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
    bcgSyncTaskResult = [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncTask usingQueue:dispatch_get_main_queue() 
      launchHandler:^(BGTask *task) {
        if (![task isKindOfClass:[BGTask class]]) {
            return;
        }
        NSLog(@"BGTask BGTaskScheduler.shared.register SYNC called");
        bgTask = (BGProcessingTask *)task;
        [self startBackgroundTask:nil];
    }];
    
    NSLog(@"BGTask SYNC registered %d", bcgSyncTaskResult);

    BOOL bcgSchedulerTaskResult;
    bcgSchedulerTaskResult = [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:syncSchedulerTask usingQueue:dispatch_get_main_queue() 
      launchHandler:^(BGTask *task) {
        if (![task isKindOfClass:[BGTask class]]) {
            return;
        }
        NSLog(@"BGTask BGTaskScheduler.shared.register SCHEDULER called");
        [self scheduleSchedulerBackgroundTask];
        [self scheduleBackgroundTask];
        [task setTaskCompletedWithSuccess:YES];
    }];
    
    NSLog(@"BGTask SCHEDULER registered %d", bcgSchedulerTaskResult);
}

- (void)startBackgroundTask:(NSString *)noValue {
    NSLog(@"BGTask startBackgroundTask called");
    
    // Schedule tasks for the next time
    [self scheduleBackgroundTask];
    [self scheduleSchedulerBackgroundTask];
    
    if (!isConnectedToWifi) {
        NSLog(@"BGTask startBackgroundTask: not connected to the wifi");
        [bgTask setTaskCompletedWithSuccess:NO];
        bgTask = nil;
        return;
    }

    // I can check the time remaining here & make a choice
    // when this `time remaing` is cracy big, something wrong is happening.
    // in my testing this time is always something like 300 seconds. (the famous 5 min).
    NSLog(@"BEFORE RUN TASKS - Time Remaining: %f", [[UIApplication sharedApplication] backgroundTimeRemaining]);
    if ([[UIApplication sharedApplication] backgroundTimeRemaining] > 1000000000) {
        NSLog(@"BGTask startBackgroundTask: time remainig TOO cracy high %f", [[UIApplication sharedApplication] backgroundTimeRemaining]);
        [bgTask setTaskCompletedWithSuccess:NO];
        bgTask = nil;
        return;
    }
    
    // Start the syncing
    NSLog(@"BGTask startBackgroundTask run sync task");
    // in order to run only one task
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_BACKGROUND, 0), ^{
      [self syncingProcessBackgroundTask:nil];
    });

    bgTask.expirationHandler = ^{
        NSLog(@"BGTask startBackgroundTask - expirationHandler called");
        // interrupting the sync process, I can't wait to see if the process is over
        // because I have no time enough to run all of this task
        char *resp2 = execute("interrupt_sync_after_batch", "true");
        NSString* respStr2 = [NSString stringWithUTF8String:resp2];
        NSLog(@"BGTask startBackgroundTask - expirationHandler interrupt syncing %@", respStr2);

        // save the wallet
        RPCModule *rpcmodule = [RPCModule new];
        [rpcmodule saveWalletInternal];
        NSLog(@"BGTask startBackgroundTask - expirationHandler Save Wallet");

        // save info in background json
        NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
        // NSTimeInterval is defined as double
        NSNumber *timeStampObj = [NSNumber numberWithDouble: timeStamp];
        NSString *timeStampStr = [timeStampObj stringValue];
        NSString *jsonBackgroud = [NSString stringWithFormat: @"%@%@%@%@%@", @"{\"batches\": \"", @"0", @"\", \"date\": \"", timeStampStr, @"\"}"];
        [rpcmodule saveBackgroundFile:jsonBackgroud];
        NSLog(@"BGTask startBackgroundTask - expirationHandler Save background JSON");

        [bgTask setTaskCompletedWithSuccess:NO];
        bgTask = nil;
        NSLog(@"BGTask startBackgroundTask - expirationHandler THE END");
    };
}

- (void)scheduleBackgroundTask {
    // This method can be called as many times as needed, the previously submitted
    // request will be overridden by the new one.
    NSLog(@"BGTask scheduleBackgroundTask called");

    BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:syncTask];
    
    // PRODUCTION
    NSDate *today = [[NSCalendar currentCalendar] startOfDayForDate:[NSDate date]];
    NSDate *tomorrow = [[NSCalendar currentCalendar] dateByAddingUnit:NSCalendarUnitDay value:1 toDate:today options:0];
    
    NSDateComponents *earlyMorningComponent = [[NSDateComponents alloc] init];
    earlyMorningComponent.hour = 3;
    earlyMorningComponent.minute = arc4random_uniform(61);
    NSDate *earlyMorning = [[NSCalendar currentCalendar] dateByAddingComponents:earlyMorningComponent toDate:tomorrow options:0];
    
    // DEVELOPMENT
    NSDate *now = [NSDate date];

    NSDate *twoMinutesLater = [now dateByAddingTimeInterval:120]; // 2 minutes = 120 seconds

    //request.earliestBeginDate = earlyMorning;
    request.earliestBeginDate = twoMinutesLater;
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
    
    // PRODUCTION
    NSDate *today = [[NSCalendar currentCalendar] startOfDayForDate:[NSDate date]];
    NSDate *tomorrow = [[NSCalendar currentCalendar] dateByAddingUnit:NSCalendarUnitDay value:1 toDate:today options:0];
    
    NSDateComponents *afternoonComponent = [[NSDateComponents alloc] init];
    afternoonComponent.hour = 14;
    afternoonComponent.minute = arc4random_uniform(61);
    NSDate *afternoon = [[NSCalendar currentCalendar] dateByAddingComponents:afternoonComponent toDate:tomorrow options:0];
    
    // DEVELOPMENT
    //NSDate *now = [NSDate date];

    //NSDate *fiveMinutesLater = [now dateByAddingTimeInterval:300]; // 5 minutes = 300 seconds

    request.earliestBeginDate = afternoon;
    //request.earliestBeginDate = fiveMinutesLater;
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
